import { Injectable, Logger } from '@nestjs/common';
import { GraphNode, ProactiveAlert } from '@couchy/shared';
import { LlmService } from '../llm/llm.service';
import { MemoryService } from '../memory/memory.service';
import { GraphService } from '../graph/graph.service';

export interface AgentStreamEvent {
  type: 'token' | 'sources' | 'alerts' | 'done';
  content?: string;
  nodes?: GraphNode[];
  alerts?: ProactiveAlert[];
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly memory: MemoryService,
    private readonly graph: GraphService,
  ) {}

  // ---------------------------------------------------------------------------
  // Main entry: stream a chat answer for a user query
  // ---------------------------------------------------------------------------

  async *streamAnswer(
    sessionId: string,
    userId: string,
    userMessage: string,
  ): AsyncGenerator<AgentStreamEvent> {
    // 1. Find relevant graph nodes from the query
    const relevantNodes = this.graph.findRelevantNodes(userMessage);
    const relevantNodeIds = relevantNodes.map((n) => n.id);

    // 2. Get subgraph (1-hop expansion) for rich context
    const { nodes: contextNodes, edges: contextEdges } =
      this.graph.getSubgraph(relevantNodeIds);

    // 3. Read long-term memory
    const longTermMemory = this.memory.readLongTerm();

    // 4. Read session history (recent context)
    const sessionHistory = this.memory.readSession(sessionId);

    // 5. Build system prompt (Jarvis Layer)
    const systemPrompt = this.buildSystemPrompt(
      longTermMemory,
      contextNodes,
      contextEdges,
      sessionHistory,
    );

    // 6. Track question for gap detection
    const gapAlerts: ProactiveAlert[] = [];
    for (const node of relevantNodes) {
      const count = this.graph.trackQuestion(sessionId, node.id);
      if (count >= 3) {
        const alert: ProactiveAlert = {
          id: `gap_${node.id}_${Date.now()}`,
          type: 'gap_detected',
          title: `⚠️ Gap: ${node.label}`,
          body: `Вопрос по "${node.label}" задавался уже ${count} раза. Рекомендуется обновить документацию или провести синк с командой.`,
          relatedNodes: [node.id],
          createdAt: new Date().toISOString(),
        };
        gapAlerts.push(alert);

        // Log gap to daily memory
        this.memory.appendDaily(
          `Gap detected for node "${node.label}" (session: ${sessionId}, count: ${count})`,
        );
      }
    }

    // 7. Check for proactive dependency alerts
    const dependencyAlerts = this.detectDependencyAlerts(
      userMessage,
      sessionId,
    );

    // 8. Stream token-by-token response from LLM
    const allTokens: string[] = [];

    for await (const token of this.llm.streamCompletion(
      userMessage,
      systemPrompt,
    )) {
      allTokens.push(token);
      yield { type: 'token', content: token };
    }

    const fullResponse = allTokens.join('');

    // 9. Yield sources (nodes referenced in context)
    if (contextNodes.length > 0) {
      yield { type: 'sources', nodes: contextNodes };
    }

    // 10. Yield alerts (gaps + dependencies)
    const allAlerts = [...gapAlerts, ...dependencyAlerts];
    if (allAlerts.length > 0) {
      yield { type: 'alerts', alerts: allAlerts };
    }

    // 11. Persist exchange to session memory (OpenClaw auto-flush)
    const sourceLabels = contextNodes.map((n) => n.label);
    this.memory.appendSession(sessionId, userMessage, fullResponse, sourceLabels);

    // 12. Done
    yield { type: 'done' };
  }

  // ---------------------------------------------------------------------------
  // Non-streaming completion (for internal tasks)
  // ---------------------------------------------------------------------------

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    return this.llm.complete(prompt, systemPrompt);
  }

  // ---------------------------------------------------------------------------
  // System Prompt Builder (Jarvis Layer)
  // ---------------------------------------------------------------------------

  private buildSystemPrompt(
    longTermMemory: string,
    contextNodes: GraphNode[],
    contextEdges: Array<{ source: string; target: string; relation: string }>,
    sessionHistory: string,
  ): string {
    // Format graph context
    const graphContext = this.formatGraphContext(contextNodes, contextEdges);

    // Format session history (last 2000 chars to keep context tight)
    const recentHistory =
      sessionHistory.length > 2000
        ? '...(truncated)\n' + sessionHistory.slice(-2000)
        : sessionHistory;

    return `# Ты — Couchy, AI-ассистент для онбординга разработчиков

Ты являешься живой памятью команды. Ты знаешь архитектуру проекта, технические задания (ТЗ) и договорённости команды в реальном времени.

## Твои принципы:
- Отвечай **точно и по делу**. Цитируй конкретные решения, ТЗ и сервисы.
- Всегда упоминай **откуда берёшь информацию** (AuthService, ТЗ-047, MEMORY.md и т.д.)
- Если замечаешь зависимость между сервисами — **предупреди об этом явно**.
- Пиши на русском языке (если не попросят иначе).

## Архитектурные решения команды (MEMORY.md):
${longTermMemory || '_(Нет данных)_'}

## Контекст из Knowledge Graph:
${graphContext || '_(Релевантных нод не найдено)_'}

${recentHistory ? `## История сессии:\n${recentHistory}` : ''}

---
Отвечай чётко, структурированно, как опытный Тимлид который объясняет джуниору.`;
  }

  private formatGraphContext(
    nodes: GraphNode[],
    edges: Array<{ source: string; target: string; relation: string }>,
  ): string {
    if (nodes.length === 0) return '';

    const nodeLines = nodes.map((n) => {
      const meta = n.metadata
        ? Object.entries(n.metadata)
            .map(([k, v]) => `  - ${k}: ${v}`)
            .join('\n')
        : '';
      return `**${n.label}** (${n.type})${meta ? '\n' + meta : ''}`;
    });

    const edgeLines = edges.map(
      (e) => `  ${e.source} ──[${e.relation}]──▶ ${e.target}`,
    );

    return [
      '### Ноды:',
      nodeLines.join('\n'),
      '',
      '### Связи:',
      edgeLines.join('\n'),
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Proactive Dependency Alert Detection
  // ---------------------------------------------------------------------------

  private detectDependencyAlerts(
    userMessage: string,
    sessionId: string,
  ): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];
    const msg = userMessage.toLowerCase();

    // Detect UserService modification intent
    if (
      msg.includes('userservice') &&
      (msg.includes('изменил') ||
        msg.includes('правлю') ||
        msg.includes('меняю') ||
        msg.includes('редактирую') ||
        msg.includes('рефакторинг') ||
        msg.includes('change') ||
        msg.includes('modif') ||
        msg.includes('update'))
    ) {
      const neighbors = this.graph.getNeighbors('UserService');
      const relatedNodeIds = ['UserService', ...neighbors.map((n) => n.node.id)];

      alerts.push({
        id: `dep_userservice_${Date.now()}`,
        type: 'dependency_warning',
        title: '⚠️ Зависимость: UserService → AuthService',
        body: 'UserService напрямую валидирует JWT через AuthService. Изменения в интерфейсе валидации токенов могут сломать UserService. Проверь ТЗ-047 раздел 3.2.',
        relatedNodes: relatedNodeIds,
        createdAt: new Date().toISOString(),
      });
    }

    // Detect AuthService modification intent
    if (
      msg.includes('authservice') &&
      (msg.includes('изменил') ||
        msg.includes('правлю') ||
        msg.includes('change') ||
        msg.includes('modif'))
    ) {
      const neighbors = this.graph.getNeighbors('AuthService');
      const relatedNodeIds = ['AuthService', ...neighbors.map((n) => n.node.id)];

      alerts.push({
        id: `dep_authservice_${Date.now()}`,
        type: 'dependency_warning',
        title: '⚠️ Зависимость: AuthService влияет на UserService',
        body: 'AuthService является критической зависимостью для UserService. Любые изменения в JWT формате или методах валидации потребуют обновления UserService.',
        relatedNodes: relatedNodeIds,
        createdAt: new Date().toISOString(),
      });
    }

    return alerts;
  }
}
