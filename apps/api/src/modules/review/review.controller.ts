import { Controller, Post, Get, Param, Body, NotFoundException } from '@nestjs/common';
import { CodeReviewService } from './code-review.service';
import type { CodeReviewRequest } from '@kibo/shared';

@Controller('review')
export class ReviewController {
  constructor(private readonly service: CodeReviewService) {}

  @Post('check')
  check(@Body() body: CodeReviewRequest) {
    return this.service.review(body);
  }

  @Get(':reportId')
  getReport(@Param('reportId') reportId: string) {
    const report = this.service.getReport(reportId);
    if (!report) throw new NotFoundException(`Report "${reportId}" not found`);
    return report;
  }
}
