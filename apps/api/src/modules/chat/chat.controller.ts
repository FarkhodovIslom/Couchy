import { Controller, Post, Get, Body, Param, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express-serve-static-core';
import { AgentService } from '../../core/agent/agent.service';
import { AlertsService } from '../alerts/alerts.service';
import { GraphService } from '../../core/graph/graph.service';
import { OnboardingService } from '../onboarding/onboarding.service';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly agent: AgentService,
    private readonly alerts: AlertsService,
    private readonly graph: GraphService,
    private readonly onboarding: OnboardingService,
  ) {}

  @Post(':sessionId/message')
  async chatStream(
    @Param('sessionId') sessionId: string,
    @Body() body: { content?: string },
    @Res() res: Response,
  ) {
    const content = (body.content ?? '').trim();
    if (!content) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Message content is required',
        code: 'EMPTY_MESSAGE',
        statusCode: 400,
      });
    }

    const depAlerts = this.alerts.checkDependencyAlerts(sessionId, content);
    const relevantNodes = this.graph.findRelevantNodes(content);
    const gapAlerts = this.alerts.checkGaps(sessionId, relevantNodes.map((n) => n.id));

    const session = this.onboarding.getSession(sessionId);
    const userId = session?.userId ?? sessionId;

    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    const preAlerts = [...depAlerts, ...gapAlerts];
    if (preAlerts.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'alerts', alerts: preAlerts })}\n\n`);
    }

    try {
      for await (const event of this.agent.streamAnswer(sessionId, userId, content)) {
        if (event.type === 'alerts' && event.alerts) {
          this.alerts.storeAlerts(sessionId, event.alerts);
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      this.logger.error('Chat stream error:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Ошибка генерации ответа. Проверьте GEMINI_API_KEY в apps/api/.env' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    }

    res.end();
  }

  @Get(':sessionId/history')
  getChatHistory(@Param('sessionId') sessionId: string) {
    return { messages: [] };
  }
}
