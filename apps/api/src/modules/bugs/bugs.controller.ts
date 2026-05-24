import { Controller, Post, Get, Body } from '@nestjs/common';
import { BugLearnService } from './bug-learn.service';
import type { BugAnalyzeRequest, BugRecordRequest } from '@kibo/shared';

@Controller('bugs')
export class BugsController {
  constructor(private readonly service: BugLearnService) {}

  @Post('analyze')
  analyze(@Body() body: BugAnalyzeRequest) {
    return this.service.analyze(body);
  }

  @Post('record')
  record(@Body() body: BugRecordRequest) {
    this.service.record(body);
    return { ok: true };
  }

  @Get('history')
  history() {
    return { history: this.service.getHistory() };
  }
}
