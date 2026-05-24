import { Controller, Get, Patch, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get(':sessionId')
  getAlerts(@Param('sessionId') sessionId: string, @Query('unread') unread?: string) {
    const all = this.alerts.getAlerts(sessionId);
    const filtered = unread === 'true' ? all.filter((a) => !a.read) : all;
    return { alerts: filtered };
  }

  @Patch(':alertId/read')
  markRead(@Param('alertId') alertId: string) {
    const ok = this.alerts.markRead(alertId);
    if (!ok) throw new HttpException('Alert not found', HttpStatus.NOT_FOUND);
    return { ok: true };
  }

  @Get('report/:sessionId')
  getReport(@Param('sessionId') sessionId: string) {
    return this.alerts.getReport(sessionId);
  }
}
