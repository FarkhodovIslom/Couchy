export interface SADraftRequest {
  description: string;
  templateId?: string;
  context?: string;
  sessionId?: string;
}

export interface SARefinedRequest {
  draftId: string;
  edits: string;
  sessionId?: string;
}

export interface SADocument {
  id: string;
  title: string;
  content: string;
  templateId: string;
  status: 'draft' | 'review' | 'approved';
  filePath: string;
  createdAt: string;
  updatedAt: string;
}
