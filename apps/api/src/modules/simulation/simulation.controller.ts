import { Controller, Post, Get, Sse, Body, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express-serve-static-core';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { SimulationService } from './simulation.service';

@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulation: SimulationService) {}

  @Post('start')
  startSimulation(@Body() body: { sessionId?: string }, @Res() res: Response) {
    const sessionId = body.sessionId ?? 'default_session';
    this.simulation.start(sessionId);
    return res.status(HttpStatus.OK).json({ ok: true });
  }

  @Post('stop')
  stopSimulation(@Res() res: Response) {
    this.simulation.stop();
    return res.status(HttpStatus.OK).json({ ok: true });
  }

  @Get('stream')
  @Sse()
  streamSimulation(): Observable<MessageEvent> {
    return this.simulation.getEventStream();
  }
}
