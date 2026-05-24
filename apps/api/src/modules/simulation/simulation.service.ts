import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MessageEvent } from '@nestjs/common';
import type { ProactiveAlert } from '@kibo/shared';
import { GraphService } from '../../core/graph/graph.service';
import { MemoryService } from '../../core/memory/memory.service';
import { AlertsService } from '../alerts/alerts.service';

interface TimelineEvent {
  at: number;
  event: string;
  payload: any;
}

const TIMELINE: TimelineEvent[] = [
  {
    at: 5000,
    event: 'commit',
    payload: {
      author: 'Jasur (Senior)',
      message: 'feat: add refresh token rotation to AuthService',
      files: ['src/auth/auth.service.ts', 'src/auth/tokens/refresh.ts'],
      relatedService: 'AuthService',
    },
  },
  {
    at: 18000,
    event: 'ticket',
    payload: {
      id: 'TS-089',
      title: 'Implement rate limiting on POST /auth/login',
      assignee: 'Алибек',
      relatedService: 'AuthService',
    },
  },
  {
    at: 32000,
    event: 'pr_comment',
    payload: {
      author: 'Камола (Tech Lead)',
      pr: '#134',
      comment: 'Эта логика дублирует UserService.validateToken() — нужно вынести в shared',
      relatedService: 'AuthService',
    },
  },
  {
    at: 47000,
    event: 'commit',
    payload: {
      author: 'Jasur (Senior)',
      message: 'refactor: UserService теперь зависит от нового AuthService.verifyToken()',
      files: ['src/users/user.service.ts'],
      breaking: true,
      relatedService: 'UserService',
    },
  },
  {
    at: 61000,
    event: 'ticket',
    payload: {
      id: 'TS-091',
      title: 'URGENT: Prod bug — refresh token не инвалидируется при logout',
      priority: 'critical',
      relatedService: 'AuthService',
    },
  },
];

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private eventSubject = new Subject<any>();
  private activeTimers: any[] = [];
  private currentSessionId: string | null = null;

  constructor(
    private readonly graph: GraphService,
    private readonly memory: MemoryService,
    private readonly alerts: AlertsService,
  ) {}

  /**
   * Return real-time events streamed via SSE.
   */
  getEventStream(): Observable<MessageEvent> {
    return this.eventSubject.asObservable().pipe(
      map((data) => ({
        data: JSON.stringify(data),
      } as MessageEvent)),
    );
  }

  /**
   * Start or Reset simulation for a user session.
   */
  start(sessionId: string): void {
    this.logger.log(`Starting simulation for session: ${sessionId}`);
    this.currentSessionId = sessionId;

    // 1. Reset active timers
    this.stop();

    // 2. Clear SQLite DB and re-seed the standard baseline graph
    this.graph.resetGraph();

    // 3. Emit simulation reset event
    this.eventSubject.next({ event: 'reset', payload: { startedAt: new Date().toISOString() } });

    // 4. Trigger timeline timers
    for (const step of TIMELINE) {
      const timer = setTimeout(() => {
        this.processEvent(step.event, step.payload);
      }, step.at);
      this.activeTimers.push(timer);
    }
  }

  /**
   * Stop all active timers.
   */
  stop(): void {
    this.logger.log('Stopping current simulation timers...');
    this.activeTimers.forEach((timer) => clearTimeout(timer));
    this.activeTimers = [];
  }

  /**
   * Handle each simulated event.
   */
  private processEvent(event: string, payload: any): void {
    const timestamp = new Date().toISOString();
    this.logger.log(`Processing simulated event: ${event} at ${timestamp}`);

    // 1. Update Knowledge Graph via SQLite
    this.updateGraphForEvent(event, payload);

    // 2. Write to Daily persistent markdown log
    this.writeDailyLog(event, payload);

    // 3. Generate session-linked ProactiveAlerts if service matches
    if (this.currentSessionId) {
      const alert = this.generateAlertForEvent(event, payload);
      if (alert) {
        this.alerts.storeAlerts(this.currentSessionId, [alert]);
      }
    }

    // 4. Stream to client Activity Feed via SSE
    this.eventSubject.next({
      event,
      timestamp,
      payload,
    });
  }

  /**
   * SQLite updates based on event type.
   */
  private updateGraphForEvent(event: string, payload: any): void {
    try {
      if (event === 'commit') {
        if (payload.message.includes('refresh token rotation')) {
          // Add refresh_token node
          this.graph.upsertNode({
            id: 'refresh_token',
            label: 'Refresh Token Rotation',
            type: 'decision',
            metadata: { description: 'Спецификация и логика ротации рефреш-токенов в AuthService.' },
          });
          // Connect refresh_token to AuthService
          this.graph.addEdge('AuthService', 'refresh_token', 'расширен_через');
        } else if (payload.breaking) {
          // UserService now depends on AuthService
          this.graph.addEdge('UserService', 'AuthService', 'зависит_от');
        }
      } else if (event === 'ticket') {
        if (payload.id === 'TS-089') {
          // ticket TS-089 already in seed, let's update it or add edge
          this.graph.addEdge('Alibek_Junior', 'ТЗ-089_RateLimit', 'активно_решает');
        } else if (payload.id === 'TS-091') {
          // Prod logout bug
          this.graph.addEdge('AuthService', 'ТЗ-091_RefreshBug', 'имеет_баг');
        }
      }
    } catch (err) {
      this.logger.error('Failed to update graph during simulation event:', err);
    }
  }

  /**
   * Daily log helper.
   */
  private writeDailyLog(event: string, payload: any): void {
    let logNote = '';
    if (event === 'commit') {
      logNote = `📦 COMMIT от ${payload.author}\nСообщение: ${payload.message}\nФайлы: ${payload.files.join(', ')}${payload.breaking ? ' [BREAKING CHANGE]' : ''}`;
    } else if (event === 'ticket') {
      logNote = `🎫 TICKET ${payload.id}\nЗаголовок: ${payload.title}\nНазначен: ${payload.assignee}\nСвязанный сервис: ${payload.relatedService}`;
    } else if (event === 'pr_comment') {
      logNote = `💬 PR COMMENT от ${payload.author} (PR ${payload.pr})\nКомментарий: "${payload.comment}"`;
    }
    this.memory.appendDaily(logNote);
  }

  /**
   * Generate session alerts.
   */
  private generateAlertForEvent(event: string, payload: any): ProactiveAlert | null {
    const timestamp = new Date().toISOString();
    
    if (event === 'commit') {
      if (payload.message.includes('refresh token rotation')) {
        return {
          id: `sim_alert_commit_5_${Date.now()}`,
          type: 'dependency_warning',
          title: '⚠️ AuthService был изменён',
          body: `${payload.author} добавил Refresh Token Rotation в AuthService. Это ваш рабочий микросервис! Сверьтесь со спецификацией ТЗ-047.`,
          relatedNodes: ['AuthService', 'Jasur_Senior', 'ТЗ-047_OAuth'],
          createdAt: timestamp,
        };
      } else if (payload.breaking) {
        return {
          id: `sim_alert_commit_47_${Date.now()}`,
          type: 'dependency_warning',
          title: '🚨 CRITICAL: Сломан UserService',
          body: `ВНИМАНИЕ! Breaking commit от ${payload.author}. UserService теперь зависит от нового AuthService.verifyToken(). Срочно обновите локальные файлы!`,
          relatedNodes: ['AuthService', 'UserService', 'Jasur_Senior'],
          createdAt: timestamp,
        };
      }
    } else if (event === 'ticket') {
      if (payload.id === 'TS-089') {
        return {
          id: `sim_alert_ticket_18_${Date.now()}`,
          type: 'context_update',
          title: '🎫 Вам назначен тикет TS-089',
          body: `Назначен тикет: "Implement rate limiting on POST /auth/login". Связанный сервис: AuthService. Рекомендуется изучить ТЗ-089.`,
          relatedNodes: ['AuthService', 'ТЗ-089_RateLimit'],
          createdAt: timestamp,
        };
      } else if (payload.id === 'TS-091') {
        return {
          id: `sim_alert_ticket_61_${Date.now()}`,
          type: 'dependency_warning',
          title: '🚨 URGENT: Prod bug TS-091',
          body: `КРИТИЧЕСКИЙ БАГ НА ПРОДУКШЕНЕ: "refresh token не инвалидируется при logout" в AuthService. Срочно перепроверьте ТЗ-091!`,
          relatedNodes: ['AuthService', 'ТЗ-091_RefreshBug'],
          createdAt: timestamp,
        };
      }
    } else if (event === 'pr_comment') {
      return {
        id: `sim_alert_pr_32_${Date.now()}`,
        type: 'dependency_warning',
        title: '💬 Важный коммент в PR #134',
        body: `${payload.author} отметила: "Эта логика дублирует UserService.validateToken() — нужно вынести в shared".`,
        relatedNodes: ['AuthService', 'UserService'],
        createdAt: timestamp,
      };
    }

    return null;
  }
}
