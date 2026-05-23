import { Injectable } from '@nestjs/common';
import { 
  Session, 
  LearningStep, 
  OnboardingStartResponse, 
  ChatMessage, 
  ProactiveAlert, 
  GraphNode, 
  GraphEdge,
  UserRole
} from '@couchy/shared';

@Injectable()
export class AppService {
  // In-memory data store for the architecture MVP
  private sessions = new Map<string, Session>();
  private learningPaths = new Map<string, LearningStep[]>();
  private chatHistories = new Map<string, ChatMessage[]>();
  private activeAlerts = new Map<string, ProactiveAlert[]>();
  private questionCounters = new Map<string, number>(); // node-id/question -> count

  // Seed Knowledge Graph nodes
  private nodes: GraphNode[] = [
    { id: 'AuthService', label: 'AuthService', type: 'service' },
    { id: 'UserService', label: 'UserService', type: 'service' },
    { id: 'ТЗ-047', label: 'ТЗ-047', type: 'spec' },
    { id: 'JWT_Decision', label: 'JWT_Decision', type: 'decision' },
    { id: 'OAuth_Flow', label: 'OAuth_Flow', type: 'decision' }
  ];

  // Seed Graph Edges
  private edges: GraphEdge[] = [
    { source: 'AuthService', target: 'ТЗ-047', relation: 'связан_с' },
    { source: 'AuthService', target: 'UserService', relation: 'влияет_на' },
    { source: 'JWT_Decision', target: 'AuthService', relation: 'часть_архитектуры' }
  ];

  startOnboarding(name: string, role: UserRole): OnboardingStartResponse {
    const sessionId = `sess_${Math.random().toString(36).substring(2, 11)}`;
    const userId = `user_${name.toLowerCase().replace(/\s+/g, '_')}`;

    // Create session
    const session: Session = {
      sessionId,
      userId,
      role,
      createdAt: new Date().toISOString()
    };
    this.sessions.set(sessionId, session);

    // Create custom learning path based on role
    const steps: LearningStep[] = [
      {
        id: 'step_tz047',
        title: 'Изучить ТЗ-047',
        description: 'Раздел 3.2: Требования к аутентификации и авторизации.',
        relatedNodes: ['AuthService', 'ТЗ-047'],
        completed: false
      },
      {
        id: 'step_jwt',
        title: 'Разобрать JWT архитектуру',
        description: 'Почему принято решение использовать JWT, а не сессии.',
        relatedNodes: ['JWT_Decision', 'AuthService'],
        completed: false
      },
      {
        id: 'step_userservice',
        title: 'Зависимость UserService',
        description: 'Изучить особенности взаимодействия UserService с AuthService.',
        relatedNodes: ['UserService', 'AuthService'],
        completed: false
      }
    ];
    
    this.learningPaths.set(sessionId, steps);
    this.chatHistories.set(sessionId, []);
    this.activeAlerts.set(sessionId, []);

    return {
      sessionId,
      learningPath: steps
    };
  }

  getLearningPath(sessionId: string): LearningStep[] {
    return this.learningPaths.get(sessionId) || [];
  }

  updateLearningStep(sessionId: string, stepId: string, completed: boolean): boolean {
    const steps = this.learningPaths.get(sessionId);
    if (!steps) return false;

    const step = steps.find(s => s.id === stepId);
    if (!step) return false;

    step.completed = completed;
    return true;
  }

  getChatHistory(sessionId: string): ChatMessage[] {
    return this.chatHistories.get(sessionId) || [];
  }

  addMessageToHistory(sessionId: string, role: 'user' | 'assistant', content: string, sources?: GraphNode[]) {
    const history = this.chatHistories.get(sessionId) || [];
    const message: ChatMessage = {
      id: `msg_${Math.random().toString(36).substring(2, 11)}`,
      role,
      content,
      sources,
      createdAt: new Date().toISOString()
    };
    history.push(message);
    this.chatHistories.set(sessionId, history);
  }

  getAlerts(sessionId: string): ProactiveAlert[] {
    return this.activeAlerts.get(sessionId) || [];
  }

  addAlert(sessionId: string, type: 'dependency_warning' | 'gap_detected' | 'context_update', title: string, body: string, relatedNodes: string[]) {
    const alerts = this.activeAlerts.get(sessionId) || [];
    const alert: ProactiveAlert = {
      id: `alert_${Math.random().toString(36).substring(2, 11)}`,
      type,
      title,
      body,
      relatedNodes,
      createdAt: new Date().toISOString()
    };
    alerts.unshift(alert); // newest first
    this.activeAlerts.set(sessionId, alerts);
  }

  getGraphSnapshot(): { nodes: GraphNode[], edges: GraphEdge[] } {
    return {
      nodes: this.nodes,
      edges: this.edges
    };
  }

  // Logic to simulate/handle questions and update graph weights or detect gaps
  handleQuestionCounter(sessionId: string, query: string): { triggerGap: boolean, count: number } {
    const isSessionQuestion = query.toLowerCase().includes('authservice') || query.toLowerCase().includes('jwt') || query.toLowerCase().includes('сессии');
    if (!isSessionQuestion) return { triggerGap: false, count: 0 };

    const key = `${sessionId}_jwt_query`;
    const count = (this.questionCounters.get(key) || 0) + 1;
    this.questionCounters.set(key, count);

    // If repeat count reaches 3 or more, mark a Gap node / trigger gap alert
    let triggerGap = false;
    if (count >= 3) {
      triggerGap = true;
      // Mark AuthService or Gap node in our snapshot nodes if not already
      const gapExists = this.nodes.some(n => n.id === 'gap_auth_session');
      if (!gapExists) {
        this.nodes.push({
          id: 'gap_auth_session',
          label: 'Gap: Аутентификация сессий повторные вопросы',
          type: 'gap',
          metadata: { questionCount: String(count) }
        });
        this.edges.push({
          source: 'AuthService',
          target: 'gap_auth_session',
          relation: 'имеет_пробел',
          weight: count
        });
      }
    }

    return { triggerGap, count };
  }
}
