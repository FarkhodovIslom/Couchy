export interface GraphNode {
  id: string;
  label: string;
  type: 'service' | 'spec' | 'gap' | 'decision';
  metadata?: Record<string, string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight?: number;
}
