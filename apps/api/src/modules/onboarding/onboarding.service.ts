import { Injectable, Logger } from '@nestjs/common';
import type { LearningStep, OnboardingStartResponse, Session, UserRole } from '@kibo/shared';
import { GraphService } from '../../core/graph/graph.service';
import { LlmService } from '../../core/llm/llm.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  // In-memory session & path store (would be DB in production)
  private sessions = new Map<string, Session>();
  private learningPaths = new Map<string, LearningStep[]>();

  // Role-specific seed steps used as fallback when LLM is unavailable
  private readonly seedSteps: Record<UserRole, LearningStep[]> = {
    junior_backend: [
      {
        id: 'step_tz047',
        title: 'Изучить ТЗ-047: Аутентификация',
        description: 'Раздел 3.2 — требования к stateless-аутентификации в микросервисной архитектуре.',
        relatedNodes: ['AuthService', 'ТЗ-047'],
        completed: false,
      },
      {
        id: 'step_jwt',
        title: 'Разобрать JWT vs Sessions',
        description: 'Почему команда выбрала JWT, как работает валидация токена без централизованного хранилища.',
        relatedNodes: ['JWT_Decision', 'AuthService'],
        completed: false,
      },
      {
        id: 'step_userservice',
        title: 'Зависимость UserService → AuthService',
        description: 'UserService валидирует токены напрямую через AuthService. Понять этот контракт.',
        relatedNodes: ['UserService', 'AuthService'],
        completed: false,
      },
    ],
    junior_frontend: [
      {
        id: 'step_auth_flow',
        title: 'Понять OAuth Flow',
        description: 'Как пользователь авторизуется: редирект, callback, токен в localStorage.',
        relatedNodes: ['OAuth_Flow', 'AuthService'],
        completed: false,
      },
      {
        id: 'step_api_contract',
        title: 'API контракт: ТЗ-047',
        description: 'Какие эндпоинты использует фронт, форматы запросов и ответов.',
        relatedNodes: ['ТЗ-047'],
        completed: false,
      },
      {
        id: 'step_sse',
        title: 'SSE стриминг в чате',
        description: 'Как реализован стриминг ответа агента через Server-Sent Events.',
        relatedNodes: ['AuthService'],
        completed: false,
      },
    ],
    qa: [
      {
        id: 'step_e2e_auth',
        title: 'E2E тест авторизации',
        description: 'Сценарии тестирования: успешный вход, невалидный токен, истёкший JWT.',
        relatedNodes: ['AuthService', 'ТЗ-047'],
        completed: false,
      },
      {
        id: 'step_dependencies',
        title: 'Карта зависимостей сервисов',
        description: 'Понять граф зависимостей: кто от кого зависит и что поломается при изменении.',
        relatedNodes: ['UserService', 'AuthService'],
        completed: false,
      },
      {
        id: 'step_regression',
        title: 'Регрессионное тестирование JWT',
        description: 'Как валидировать что изменения в AuthService не ломают UserService.',
        relatedNodes: ['JWT_Decision', 'UserService'],
        completed: false,
      },
    ],
    lead: [
      {
        id: 'step_lead_graph',
        title: 'Обзор Knowledge Graph',
        description: 'Карта всех сервисов, зависимостей и документов команды в Kibo AI.',
        relatedNodes: ['AuthService', 'UserService', 'ApiGateway'],
        completed: false,
      },
      {
        id: 'step_lead_gaps',
        title: 'Gap Detection — пробелы в онбординге',
        description: 'Как Kibo AI выявляет пробелы в знаниях и что делать с алертами.',
        relatedNodes: [],
        completed: false,
      },
      {
        id: 'step_lead_report',
        title: 'Отчёт для лида',
        description: 'Как читать /report: топ вопросы, пробелы и рекомендации.',
        relatedNodes: [],
        completed: false,
      },
    ],
    sa: [
      {
        id: 'step_sa_writer',
        title: 'SA Writer — генерация спеков',
        description: 'Как использовать SA Writer для создания структурированных СА-спецификаций.',
        relatedNodes: [],
        completed: false,
      },
      {
        id: 'step_sa_templates',
        title: 'Шаблоны СА-спецификаций',
        description: 'Стандартные шаблоны команды: структура, обязательные секции.',
        relatedNodes: [],
        completed: false,
      },
      {
        id: 'step_sa_review',
        title: 'Code Review против СА',
        description: 'Как проверить что реализация соответствует СА-спеку через Code Review.',
        relatedNodes: [],
        completed: false,
      },
    ],
  };

  constructor(
    private readonly graph: GraphService,
    private readonly llm: LlmService,
  ) {}

  async startOnboarding(name: string, role: UserRole): Promise<OnboardingStartResponse> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = `user_${name.toLowerCase().replace(/\s+/g, '_')}`;

    const session: Session = {
      sessionId,
      userId,
      role,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, session);

    // Build learning path (LLM-enhanced or seed fallback)
    const learningPath = await this.buildLearningPath(name, role);
    this.learningPaths.set(sessionId, learningPath);

    this.logger.log(`Onboarding started for ${name} (${role}) → session: ${sessionId}`);

    return { sessionId, learningPath };
  }

  /**
   * Build a personalized learning path via the agent (LLM).
   * Falls back to seed steps if LLM is unavailable.
   */
  private async buildLearningPath(name: string, role: UserRole): Promise<LearningStep[]> {
    try {
      const allNodes = this.graph.getAllNodes();
      const nodeList = allNodes
        .map((n) => `- ${n.id} (${n.type}): ${n.metadata?.description ?? n.label}`)
        .join('\n');

      const prompt = `
Ты — AI-ассистент для онбординга разработчиков.

Новый разработчик: ${name}
Роль: ${role}

Доступные сущности в Knowledge Graph:
${nodeList}

Создай персонализированный трек обучения из СТРОГО 3 шагов для роли "${role}".
Каждый шаг должен быть релевантен роли и логически связан с нодами графа.

Ответь ТОЛЬКО валидным JSON массивом из 3 объектов, без пояснений, без markdown:
[
  {
    "id": "step_1",
    "title": "Заголовок шага (до 60 символов)",
    "description": "Описание что нужно изучить (1-2 предложения)",
    "relatedNodes": ["NodeId1", "NodeId2"],
    "completed": false
  }
]

Используй только существующие node id из списка выше для relatedNodes.`.trim();

      const raw = await this.llm.complete(prompt);

      // Extract JSON from the response (strip possible markdown fences)
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in LLM response');

      const parsed: LearningStep[] = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid learning path structure');
      }

      // Ensure completed field is always false (fresh start)
      return parsed.map((step, i) => ({
        id: step.id || `step_${i + 1}`,
        title: step.title || `Шаг ${i + 1}`,
        description: step.description || '',
        relatedNodes: Array.isArray(step.relatedNodes) ? step.relatedNodes : [],
        completed: false,
      }));
    } catch (err) {
      this.logger.warn(`LLM learning path failed, using seed steps: ${err}`);
      return this.seedSteps[role] ?? this.seedSteps['junior_backend'];
    }
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getLearningPath(sessionId: string): LearningStep[] {
    return this.learningPaths.get(sessionId) ?? [];
  }

  updateStep(sessionId: string, stepId: string, completed: boolean): boolean {
    const steps = this.learningPaths.get(sessionId);
    if (!steps) return false;
    const step = steps.find((s) => s.id === stepId);
    if (!step) return false;
    step.completed = completed;
    return true;
  }

  getProgress(sessionId: string): { total: number; completed: number; percent: number } {
    const steps = this.learningPaths.get(sessionId) ?? [];
    const total = steps.length;
    const completed = steps.filter((s) => s.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percent };
  }
}
