export interface GenerateDocRequest {
  featureId: string;
  code: string;
  language?: string;
  tzId?: string;
  sessionId?: string;
}

export interface GeneratedDoc {
  id: string;
  featureId: string;
  title: string;
  content: string;
  filePath: string;
  generatedAt: string;
}
