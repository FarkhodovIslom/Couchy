import { Injectable } from '@nestjs/common';
import type { BugAnalyzeRequest, BugRiskReport, BugRecordRequest } from '@kibo/shared';
import { AgentService } from '../../core/agent/agent.service';
import { GraphService } from '../../core/graph/graph.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BugLearnService {
  private readonly reports = new Map<string, BugRiskReport>();
  private readonly records: BugRecordRequest[] = [];
  private readonly bugsDir = path.resolve(process.cwd(), 'bugs');

  constructor(
    private readonly agent: AgentService,
    private readonly graph: GraphService,
  ) {
    if (!fs.existsSync(this.bugsDir)) {
      fs.mkdirSync(this.bugsDir, { recursive: true });
    }
  }

  async analyze(request: BugAnalyzeRequest): Promise<BugRiskReport> {
    const history = this.records
      .filter((r) => r.service === (request.context ?? ''))
      .map((r) => `Bug ${r.bugId}: ${r.description}`)
      .join('\n');

    const report = await this.agent.analyzeBug({ ...request, bugHistory: history });
    this.reports.set(report.id, report);
    return report;
  }

  record(request: BugRecordRequest): void {
    this.records.push(request);
    const filePath = path.join(this.bugsDir, `${request.bugId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(request, null, 2), 'utf8');

    // Track bug pattern as graph node
    this.graph.upsertNode({
      id: `bug_${request.bugId}`,
      label: `Bug: ${request.description.slice(0, 50)}`,
      type: 'gap',
      metadata: { service: request.service, bugId: request.bugId },
    });
  }

  getHistory(): BugRecordRequest[] {
    return [...this.records];
  }
}
