import { Injectable } from '@nestjs/common';
import type { CodeReviewRequest, CodeReviewReport } from '@kibo/shared';
import { AgentService } from '../../core/agent/agent.service';

@Injectable()
export class CodeReviewService {
  private readonly reports = new Map<string, CodeReviewReport>();

  constructor(private readonly agent: AgentService) {}

  async review(request: CodeReviewRequest): Promise<CodeReviewReport> {
    const report = await this.agent.reviewCode(request);
    this.reports.set(report.id, report);
    return report;
  }

  getReport(reportId: string): CodeReviewReport | undefined {
    return this.reports.get(reportId);
  }
}
