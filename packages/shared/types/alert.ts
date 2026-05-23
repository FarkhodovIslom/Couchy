export interface ProactiveAlert {
  id: string;
  type: 'dependency_warning' | 'gap_detected' | 'context_update';
  title: string;
  body: string;
  relatedNodes: string[];
  createdAt: string;
}
