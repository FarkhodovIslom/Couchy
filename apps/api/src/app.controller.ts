import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AgentService } from './agent/agent.service';
import { GraphService } from './graph/graph.service';
import { UserRole } from '@couchy/shared';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly agentService: AgentService,
    private readonly graphService: GraphService,
  ) {}

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  @Post('onboarding/start')
  startOnboarding(@Body() body: { name: string; role: UserRole }) {
    return this.appService.startOnboarding(
      body.name || 'Аноним',
      body.role || 'junior_backend',
    );
  }

  @Get('onboarding/:sessionId/path')
  getLearningPath(@Param('sessionId') sessionId: string) {
    return { steps: this.appService.getLearningPath(sessionId) };
  }

  @Patch('onboarding/:sessionId/step/:stepId')
  updateLearningStep(
    @Param('sessionId') sessionId: string,
    @Param('stepId') stepId: string,
    @Body() body: { completed: boolean },
  ) {
    const success = this.appService.updateLearningStep(
      sessionId,
      stepId,
      body.completed,
    );
    return { ok: success };
  }

  // ---------------------------------------------------------------------------
  // Chat — real LLM streaming via AgentService
  // ---------------------------------------------------------------------------

  @Get('chat/:sessionId/history')
  getChatHistory(@Param('sessionId') sessionId: string) {
    return { messages: this.appService.getChatHistory(sessionId) };
  }

  @Post('chat/:sessionId/message')
  async chatStream(
    @Param('sessionId') sessionId: string,
    @Body() body: { content: string },
    @Res() res: Response,
  ) {
    const content = (body.content || '').trim();
    if (!content) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Message content is required',
        code: 'EMPTY_MESSAGE',
        statusCode: 400,
      });
    }

    // Save user message
    this.appService.addMessageToHistory(sessionId, 'user', content);

    // SSE headers
    res.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const session = this.appService.getSession(sessionId);
    const userId = session?.userId ?? sessionId;

    const allTokens: string[] = [];

    try {
      for await (const event of this.agentService.streamAnswer(
        sessionId,
        userId,
        content,
      )) {
        if (event.type === 'token') {
          allTokens.push(event.content ?? '');
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      const errorEvent = {
        type: 'error',
        content: 'Ошибка при генерации ответа. Проверьте GEMINI_API_KEY.',
      };
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    }

    // Persist assistant message to in-memory history
    if (allTokens.length > 0) {
      this.appService.addMessageToHistory(
        sessionId,
        'assistant',
        allTokens.join(''),
      );
    }

    res.end();
  }

  // ---------------------------------------------------------------------------
  // Alerts
  // ---------------------------------------------------------------------------

  @Get('alerts/:sessionId')
  getAlerts(@Param('sessionId') sessionId: string) {
    return { alerts: this.appService.getAlerts(sessionId) };
  }

  // ---------------------------------------------------------------------------
  // Knowledge Graph
  // ---------------------------------------------------------------------------

  @Get('graph/snapshot')
  getGraphSnapshot() {
    return {
      nodes: this.graphService.getAllNodes(),
      edges: this.graphService.getAllEdges(),
    };
  }
}
