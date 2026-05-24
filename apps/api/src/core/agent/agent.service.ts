import { Injectable, Logger } from '@nestjs/common';
import type {
  GraphNode, GraphEdge, ProactiveAlert,
  LearningStep, UserRole,
  GenerateDocRequest, GeneratedDoc,
  CodeReviewRequest, CodeReviewReport,
  BugAnalyzeRequest, BugRiskReport,
  SADraftRequest, SADocument,
} from '@kibo/shared';
import { LlmService, ThinkingLevel } from '../llm/llm.service';
import { MemoryService } from '../memory/memory.service';
import { GraphService } from '../graph/graph.service';
import { RagIndexService } from '../rag/rag-index.service';
import { ClassifyService } from '../classify/classify.service';
import { loadPromptWithVars } from '../../shared/prompts/prompt-loader';
import * as crypto from 'crypto';

export interface AgentStreamEvent {
  type: 'token' | 'thinking' | 'sources' | 'alerts' | 'suggestions' | 'step_complete' | 'done' | 'error';
  content?: string;
  nodes?: GraphNode[];
  alerts?: ProactiveAlert[];
  suggestions?: string[];
  stepId?: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly memory: MemoryService,
    private readonly graph: GraphService,
    private readonly rag: RagIndexService,
    private readonly classify: ClassifyService,
  ) {}

  // ---------------------------------------------------------------------------
  // Main entry: stream a chat answer for a user query
  // ---------------------------------------------------------------------------

  async *streamAnswer(
    sessionId: string,
    userId: string,
    userMessage: string,
    options?: { thinkingLevel?: ThinkingLevel },
  ): AsyncGenerator<AgentStreamEvent> {
    const relevantNodes = this.graph.findRelevantNodes(userMessage);
    const relevantNodeIds = relevantNodes.map((n) => n.id);
    const { nodes: contextNodes, edges: contextEdges } = this.graph.getSubgraph(relevantNodeIds);
    const longTermMemory = this.memory.readLongTerm();
    const sessionHistory = this.memory.readSession(sessionId);

    const systemPrompt = this.buildSystemPrompt(longTermMemory, contextNodes, contextEdges, sessionHistory);

    // Gap detection
    const gapAlerts: ProactiveAlert[] = [];
    for (const node of relevantNodes) {
      const count = this.graph.trackQuestion(sessionId, node.id);
      if (count >= 3) {
        gapAlerts.push({
          id: `gap_${node.id}_${Date.now()}`,
          type: 'gap_detected',
          severity: count >= 5 ? 'critical' : 'warning',
          read: false,
          title: `⚠️ Gap: ${node.label}`,
          body: `Вопрос по "${node.label}" задавался уже ${count} раза. Рекомендуется обновить документацию.`,
          relatedNodes: [node.id],
          sessionId,
          createdAt: new Date().toISOString(),
        });
        this.memory.appendDaily(`Gap detected for node "${node.label}" (session: ${sessionId}, count: ${count})`);
      }
    }

    const dependencyAlerts = this.detectDependencyAlerts(userMessage, sessionId);
    const allTokens: string[] = [];

    for await (const token of this.llm.streamCompletion(userMessage, systemPrompt, options)) {
      allTokens.push(token);
      yield { type: 'token', content: token };
    }

    const fullResponse = allTokens.join('');

    if (contextNodes.length > 0) yield { type: 'sources', nodes: contextNodes };

    const allAlerts = [...gapAlerts, ...dependencyAlerts];
    if (allAlerts.length > 0) yield { type: 'alerts', alerts: allAlerts };

    // Generate suggested follow-up questions (rule-based for speed)
    const suggestions = this.generateSuggestions(contextNodes, relevantNodeIds);
    if (suggestions.length > 0) yield { type: 'suggestions', suggestions };

    const sourceLabels = contextNodes.map((n) => n.label);
    this.memory.appendSession(sessionId, userMessage, fullResponse, sourceLabels);

    yield { type: 'done' };
  }

  // ---------------------------------------------------------------------------
  // Build learning path for a user
  // ---------------------------------------------------------------------------

  async buildLearningPath(name: string, role: UserRole, graphNodes: GraphNode[]): Promise<LearningStep[]> {
    try {
      const nodesSummary = graphNodes.slice(0, 20).map((n) => `${n.id}: ${n.label} (${n.type})`).join('\n');
      const prompt = loadPromptWithVars('onboarding', {
        name,
        role,
        graphNodes: nodesSummary,
      });

      const raw = await this.llm.complete(prompt);
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in LLM response');
      return JSON.parse(jsonMatch[0]) as LearningStep[];
    } catch (err) {
      this.logger.error('buildLearningPath LLM error, using seed fallback:', err);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Doc generation
  // ---------------------------------------------------------------------------

  async generateDoc(request: GenerateDocRequest & { tzContext?: string; longTermMem?: string }): Promise<GeneratedDoc> {
    const ragContext = await this.rag.searchCode(request.featureId, 3);
    const longTermMemory = this.memory.readLongTerm();
    const tzContext = ragContext.map((r) => r.content).join('\n\n');

    const prompt = loadPromptWithVars('doc-gen', {
      featureId: request.featureId,
      language: request.language ?? 'TypeScript',
      code: request.code,
      tzContext,
      longTermMemory,
    });

    const content = await this.llm.complete(prompt, undefined, { thinkingLevel: 'medium' });
    const titleMatch = content.match(/^##?\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : request.featureId;

    return {
      id: crypto.randomUUID(),
      featureId: request.featureId,
      title,
      content,
      filePath: `docs/${request.featureId}.md`,
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Code review
  // ---------------------------------------------------------------------------

  async reviewCode(request: CodeReviewRequest & { saContent?: string }): Promise<CodeReviewReport> {
    const prompt = loadPromptWithVars('review', {
      code: request.code,
      saContent: request.saContent ?? '_(СА-спек не предоставлен)_',
    });

    const raw = await this.llm.complete(prompt, undefined, { thinkingLevel: 'high' });
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      return { id: crypto.randomUUID(), reviewedAt: new Date().toISOString(), ...parsed };
    } catch {
      return {
        id: crypto.randomUUID(),
        passed: false,
        score: 0,
        issues: [],
        summary: raw.slice(0, 500),
        reviewedAt: new Date().toISOString(),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Bug analysis
  // ---------------------------------------------------------------------------

  async analyzeBug(request: BugAnalyzeRequest & { bugHistory?: string }): Promise<BugRiskReport> {
    const prompt = loadPromptWithVars('bug-analyze', {
      code: request.code,
      context: request.context,
      bugHistory: request.bugHistory ?? '_(История багов не найдена)_',
    });

    const raw = await this.llm.complete(prompt, undefined, { thinkingLevel: 'high' });
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      return { id: crypto.randomUUID(), analyzedAt: new Date().toISOString(), ...parsed };
    } catch {
      return {
        id: crypto.randomUUID(),
        risks: [],
        score: 0,
        summary: raw.slice(0, 500),
        analyzedAt: new Date().toISOString(),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // SA writer
  // ---------------------------------------------------------------------------

  async writeSA(request: SADraftRequest & { template?: string }): Promise<string> {
    const longTermMemory = this.memory.readLongTerm();
    const prompt = loadPromptWithVars('sa-draft', {
      description: request.description,
      template: request.template ?? '_(Стандартный шаблон)_',
      longTermMemory,
    });
    return this.llm.complete(prompt, undefined, { thinkingLevel: 'medium' });
  }

  // ---------------------------------------------------------------------------
  // Non-streaming completion
  // ---------------------------------------------------------------------------

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    return this.llm.complete(prompt, systemPrompt);
  }

  // ---------------------------------------------------------------------------
  // System Prompt Builder (Kibo Layer)
  // ---------------------------------------------------------------------------

  private buildSystemPrompt(
    longTermMemory: string,
    contextNodes: GraphNode[],
    contextEdges: GraphEdge[],
    sessionHistory: string,
  ): string {
    const graphContext = this.formatGraphContext(contextNodes, contextEdges);
    const recentHistory = sessionHistory.length > 2000
      ? '...(truncated)\n' + sessionHistory.slice(-2000)
      : sessionHistory;

    return loadPromptWithVars('chat', {
      longTermMemory: longTermMemory || '_(Нет данных)_',
      graphContext: graphContext || '_(Релевантных нод не найдено)_',
      sessionHistory: recentHistory ? `## История сессии:\n${recentHistory}` : '',
    }) || this.fallbackSystemPrompt(longTermMemory, graphContext, recentHistory);
  }

  private fallbackSystemPrompt(mem: string, graph: string, history: string): string {
    return `# Ты — Kibo AI, AI-ассистент для онбординга разработчиков\n\n## Архитектурные решения:\n${mem || '_(нет данных)_'}\n\n## Граф:\n${graph || '_(пусто)_'}\n\n${history ? `## История:\n${history}` : ''}\n\n---\nОтвечай чётко, на русском, как опытный тимлид.`;
  }

  private formatGraphContext(nodes: GraphNode[], edges: Array<{ source: string; target: string; relation: string }>): string {
    if (nodes.length === 0) return '';
    const nodeLines = nodes.map((n) => {
      const meta = n.metadata ? Object.entries(n.metadata).map(([k, v]) => `  - ${k}: ${v}`).join('\n') : '';
      return `**${n.label}** (${n.type})${meta ? '\n' + meta : ''}`;
    });
    const edgeLines = edges.map((e) => `  ${e.source} ──[${e.relation}]──▶ ${e.target}`);
    return ['### Ноды:', nodeLines.join('\n'), '', '### Связи:', edgeLines.join('\n')].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Suggested Questions Generator (rule-based, no LLM call)
  // ---------------------------------------------------------------------------

  private generateSuggestions(contextNodes: GraphNode[], mentionedNodeIds: string[]): string[] {
    const suggestions: string[] = [];
    const mentionedSet = new Set(mentionedNodeIds);

    for (const node of contextNodes) {
      if (suggestions.length >= 3) break;

      // Suggest exploring neighbors not yet mentioned
      const neighbors = this.graph.getNeighbors(node.id);
      for (const nb of neighbors) {
        if (suggestions.length >= 3) break;
        if (mentionedSet.has(nb.node.id)) continue;

        if (nb.node.type === 'spec') {
          suggestions.push(`Расскажи подробнее про ${nb.node.label}`);
        } else if (nb.node.type === 'service') {
          suggestions.push(`Какие зависимости есть у ${nb.node.label}?`);
        } else if (nb.node.type === 'person') {
          suggestions.push(`Кто отвечает за ${node.label}?`);
        } else if (nb.node.type === 'gap') {
          suggestions.push(`Что не покрыто документацией в ${node.label}?`);
        }
      }

      // Suggest relationship questions
      if (suggestions.length < 3 && contextNodes.length > 1) {
        const other = contextNodes.find((n) => n.id !== node.id);
        if (other) {
          suggestions.push(`Как ${node.label} связан с ${other.label}?`);
        }
      }
    }

    // Fallback if no context-based suggestions
    if (suggestions.length === 0) {
      const allNodes = this.graph.getAllNodes();
      const services = allNodes.filter((n) => n.type === 'service').slice(0, 2);
      for (const svc of services) {
        suggestions.push(`Расскажи про архитектуру ${svc.label}`);
      }
    }

    // Deduplicate and limit to 3
    return [...new Set(suggestions)].slice(0, 3);
  }

  // ---------------------------------------------------------------------------
  // Dependency alert detection
  // ---------------------------------------------------------------------------

  private detectDependencyAlerts(userMessage: string, sessionId: string): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];
    const msg = userMessage.toLowerCase();
    const modifyKeywords = ['изменил', 'правлю', 'меняю', 'редактирую', 'рефакторинг', 'change', 'modif', 'update'];

    if (msg.includes('userservice') && modifyKeywords.some((k) => msg.includes(k))) {
      const neighbors = this.graph.getNeighbors('UserService');
      alerts.push({
        id: `dep_userservice_${Date.now()}`,
        type: 'dependency_warning',
        severity: 'warning',
        read: false,
        sessionId,
        title: '⚠️ Зависимость: UserService → AuthService',
        body: 'UserService напрямую валидирует JWT через AuthService. Изменения могут сломать цепочку авторизации.',
        relatedNodes: ['UserService', ...neighbors.map((n) => n.node.id)],
        createdAt: new Date().toISOString(),
      });
    }

    if (msg.includes('authservice') && modifyKeywords.some((k) => msg.includes(k))) {
      const neighbors = this.graph.getNeighbors('AuthService');
      alerts.push({
        id: `dep_authservice_${Date.now()}`,
        type: 'dependency_warning',
        severity: 'critical',
        read: false,
        sessionId,
        title: '⚠️ Зависимость: AuthService влияет на UserService',
        body: 'AuthService — критическая зависимость. Изменения в JWT формате потребуют обновления UserService.',
        relatedNodes: ['AuthService', ...neighbors.map((n) => n.node.id)],
        createdAt: new Date().toISOString(),
      });
    }

    return alerts;
  }
}
