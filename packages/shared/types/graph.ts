export type NodeType = 'service' | 'spec' | 'gap' | 'decision' | 'person' | 'ticket';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  metadata?: Record<string, string>;
  weight?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
