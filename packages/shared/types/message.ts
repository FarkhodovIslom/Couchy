import { GraphNode } from './graph';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: GraphNode[];
  createdAt: string;
}
