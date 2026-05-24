export interface CodeReviewRequest {
  code: string;
  saDocId?: string;
  sessionId?: string;
}

export interface CodeReviewIssue {
  line?: number;
  requirement?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

export interface CodeReviewReport {
  id: string;
  passed: boolean;
  score: number;
  issues: CodeReviewIssue[];
  summary: string;
  reviewedAt: string;
}
