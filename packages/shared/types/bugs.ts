export interface BugAnalyzeRequest {
  code: string;
  context: string;
  sessionId?: string;
}

export interface BugRisk {
  pattern: string;
  probability: 'low' | 'medium' | 'high';
  description: string;
  pastBugId?: string;
}

export interface BugRiskReport {
  id: string;
  risks: BugRisk[];
  score: number;
  summary: string;
  analyzedAt: string;
}

export interface BugRecordRequest {
  bugId: string;
  code: string;
  fix: string;
  description: string;
  service: string;
}
