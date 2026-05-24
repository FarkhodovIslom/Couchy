export type AlertType =
  | 'dependency_warning'
  | 'gap_detected'
  | 'context_update'
  | 'breaking_change'
  | 'ticket_assigned';

export interface ProactiveAlert {
  id: string;
  type: AlertType;
  sessionId?: string;
  title: string;
  body: string;
  relatedNodes: string[];
  severity?: 'info' | 'warning' | 'critical';
  read?: boolean;
  createdAt: string;
}
