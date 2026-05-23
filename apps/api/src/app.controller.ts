import { Controller, Post, Get, Patch, Body, Param, Res, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { UserRole } from '@couchy/shared';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('onboarding/start')
  startOnboarding(@Body() body: { name: string; role: UserRole }) {
    return this.appService.startOnboarding(body.name || 'Аноним', body.role || 'junior_backend');
  }

  @Get('onboarding/:sessionId/path')
  getLearningPath(@Param('sessionId') sessionId: string) {
    return { steps: this.appService.getLearningPath(sessionId) };
  }

  @Patch('onboarding/:sessionId/step/:stepId')
  updateLearningStep(
    @Param('sessionId') sessionId: string,
    @Param('stepId') stepId: string,
    @Body() body: { completed: boolean }
  ) {
    const success = this.appService.updateLearningStep(sessionId, stepId, body.completed);
    return { ok: success };
  }

  @Get('chat/:sessionId/history')
  getChatHistory(@Param('sessionId') sessionId: string) {
    return { messages: this.appService.getChatHistory(sessionId) };
  }

  @Get('alerts/:sessionId')
  getAlerts(@Param('sessionId') sessionId: string) {
    return { alerts: this.appService.getAlerts(sessionId) };
  }

  @Get('graph/snapshot')
  getGraphSnapshot() {
    return this.appService.getGraphSnapshot();
  }

  @Post('chat/:sessionId/message')
  async chatStream(
    @Param('sessionId') sessionId: string,
    @Body() body: { content: string },
    @Res() res: Response
  ) {
    const content = body.content || '';
    
    // Save user message to history
    this.appService.addMessageToHistory(sessionId, 'user', content);

    // Initialize SSE Headers
    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Handle interactive questions and logic
    const { triggerGap, count } = this.appService.handleQuestionCounter(sessionId, content);

    let assistantResponse = '';
    let sources: any[] = [];
    let alertsToTrigger: any[] = [];

    // Formulate response token by token
    if (content.toLowerCase().includes('jwt') || content.toLowerCase().includes('сесси')) {
      assistantResponse = `Привет! Согласно архитектурным решениям команды (запись в MEMORY.md от 2026-03-10), в **AuthService** используется **JWT (JSON Web Token)** вместо сессий.

Вот основные причины:
1. **Stateless архитектура**: Микросервисы должны масштабироваться горизонтально. Классические сессии требуют shared-state (например, Redis), что усложняет архитектуру.
2. **Локальная валидация**: Каждый микросервис (например, \`UserService\`) может валидировать подпись JWT токена самостоятельно, без сетевых походов в \`AuthService\`.

Смотри **ТЗ-047 раздел 3.2** для детальных требований.`;
      
      sources = [
        { id: 'ТЗ-047', label: 'ТЗ-047', type: 'spec' },
        { id: 'JWT_Decision', label: 'JWT_Decision', type: 'decision' }
      ];

      if (triggerGap) {
        alertsToTrigger.push({
          id: `alert_gap_${Date.now()}`,
          type: 'gap_detected',
          title: '⚠️ Выявлен пробел знаний (Gap Detection)',
          body: `Алибек спросил про "JWT вместо сессий" уже ${count} раза. Рекомендуется дополнить onboarding-документацию или провести Q&A сессию.`,
          relatedNodes: ['AuthService', 'JWT_Decision'],
          createdAt: new Date().toISOString()
        });
        
        // Add to active alerts
        this.appService.addAlert(
          sessionId, 
          'gap_detected', 
          '⚠️ Выявлен пробел знаний (Gap Detection)',
          `Алибек спросил про "JWT вместо сессий" уже ${count} раза. Рекомендуется дополнить onboarding-документацию или провести Q&A сессию.`,
          ['AuthService', 'JWT_Decision']
        );
      }
    } else if (content.toLowerCase().includes('изменил userservice') || content.toLowerCase().includes('userservice')) {
      assistantResponse = `Я заметил, что ты упомянул изменение **UserService**. 

⚠️ **Важное предупреждение о зависимости!**
Поскольку \`UserService\` напрямую валидирует JWT токены через \`AuthService\`, любые изменения в формате токена или методах валидации в \`AuthService\` повлияют на работу \`UserService\`.

Не ходи в БД за пользователем без валидации токена. Смотри **ТЗ-047 раздел 3.2**.`;
      
      sources = [
        { id: 'UserService', label: 'UserService', type: 'service' },
        { id: 'AuthService', label: 'AuthService', type: 'service' },
        { id: 'ТЗ-047', label: 'ТЗ-047', type: 'spec' }
      ];

      alertsToTrigger.push({
        id: `alert_dep_${Date.now()}`,
        type: 'dependency_warning',
        title: '⚠️ Зависимость с AuthService',
        body: 'UserService валидирует JWT напрямую через AuthService. Изменения могут затронуть ТЗ-047 раздел 3.2.',
        relatedNodes: ['UserService', 'AuthService', 'ТЗ-047'],
        createdAt: new Date().toISOString()
      });

      this.appService.addAlert(
        sessionId,
        'dependency_warning',
        '⚠️ Зависимость с AuthService',
        'UserService валидирует JWT напрямую через AuthService. Изменения могут затронуть ТЗ-047 раздел 3.2.',
        ['UserService', 'AuthService', 'ТЗ-047']
      );
    } else {
      assistantResponse = `Привет! Я твой AI-ассистент Couchy. Я знаю всю кодовую базу, ТЗ и соглашения нашей команды в реальном времени.

Задавай мне любые вопросы по проекту, например:
- *Почему в AuthService используется JWT а не сессии?*
- *Я собираюсь изменить UserService, на что это повлияет?*

Давай учиться вместе!`;
      sources = [
        { id: 'AuthService', label: 'AuthService', type: 'service' },
        { id: 'UserService', label: 'UserService', type: 'service' }
      ];
    }

    // Save assistant response to history
    this.appService.addMessageToHistory(sessionId, 'assistant', assistantResponse, sources);

    // Simulate token-by-token streaming
    const words = assistantResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      const token = words[i] + (i === words.length - 1 ? '' : ' ');
      res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      // small delay to simulate generation
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // Stream sources
    if (sources.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'sources', nodes: sources })}\n\n`);
    }

    // Stream alerts if any were generated
    if (alertsToTrigger.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'alerts', alerts: alertsToTrigger })}\n\n`);
    }

    // Stream done signals
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }
}
