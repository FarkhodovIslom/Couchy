import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express-serve-static-core';

import { AgentService } from './core/agent/agent.service';
import { OnboardingService } from './modules/onboarding/onboarding.service';
import { AlertsService } from './modules/alerts/alerts.service';
import { GraphService } from './core/graph/graph.service';
import type { UserRole } from '@kibo/shared';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly agent: AgentService,
    private readonly onboarding: OnboardingService,
    private readonly alerts: AlertsService,
    private readonly graph: GraphService,
  ) {}

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  @Post('onboarding/start')
  async startOnboarding(@Body() body: { name?: string; role?: UserRole }) {
    const name = (body.name ?? 'Аноним').trim();
    const role: UserRole = body.role ?? 'junior_backend';
    return this.onboarding.startOnboarding(name, role);
  }

  @Get('onboarding/:sessionId/path')
  getLearningPath(@Param('sessionId') sessionId: string) {
    return { steps: this.onboarding.getLearningPath(sessionId) };
  }

  @Patch('onboarding/:sessionId/step/:stepId')
  updateLearningStep(
    @Param('sessionId') sessionId: string,
    @Param('stepId') stepId: string,
    @Body() body: { completed: boolean },
  ) {
    const ok = this.onboarding.updateStep(sessionId, stepId, !!body.completed);
    return { ok };
  }

  // ---------------------------------------------------------------------------
  // Chat — real SSE stream from AgentService
  // ---------------------------------------------------------------------------

  @Post('chat/:sessionId/message')
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

    // Run proactive dependency check before streaming
    const depAlerts = this.alerts.checkDependencyAlerts(sessionId, content);

    // Detect relevant nodes for gap tracking
    const relevantNodes = this.graph.findRelevantNodes(content);
    const gapAlerts = this.alerts.checkGaps(
      sessionId,
      relevantNodes.map((n) => n.id),
    );

    // Resolve userId from onboarding session (fallback to sessionId)
    const session = this.onboarding.getSession(sessionId);
    const userId = session?.userId ?? sessionId;

    // Set SSE headers
    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable nginx buffering if present
    });

    // Send any pre-computed alerts immediately (dependency + gap from this question)
    const preAlerts = [...depAlerts, ...gapAlerts];
    if (preAlerts.length > 0) {
      res.write(
        `data: ${JSON.stringify({ type: 'alerts', alerts: preAlerts })}\n\n`,
      );
    }

    try {
      for await (const event of this.agent.streamAnswer(
        sessionId,
        userId,
        content,
      )) {
        // Store any alerts produced by AgentService into AlertsService
        if (event.type === 'alerts' && event.alerts) {
          this.alerts.storeAlerts(sessionId, event.alerts);
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      this.logger.error('Chat stream error:', err);
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          content:
            'Ошибка генерации ответа. Проверьте GEMINI_API_KEY в apps/api/.env',
        })}\n\n`,
      );
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    }

    res.end();
  }

  @Get('chat/:sessionId/history')
  getChatHistory(@Param('sessionId') sessionId: string) {
    // History is persisted in session markdown files by MemoryService
    // For simplicity the in-memory chat history is read via agent (future: DB)
    return { messages: [] };
  }

  // ---------------------------------------------------------------------------
  // Alerts
  // ---------------------------------------------------------------------------

  @Get('alerts/:sessionId')
  getAlerts(@Param('sessionId') sessionId: string) {
    return { alerts: this.alerts.getAlerts(sessionId) };
  }

  // ---------------------------------------------------------------------------
  // Knowledge Graph
  // ---------------------------------------------------------------------------

  @Get('graph/snapshot')
  getGraphSnapshot() {
    return {
      nodes: this.graph.getAllNodes(),
      edges: this.graph.getAllEdges(),
    };
  }
}
