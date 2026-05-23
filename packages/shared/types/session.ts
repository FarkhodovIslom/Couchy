export type UserRole = 'junior_backend' | 'junior_frontend' | 'qa';

export interface Session {
  sessionId: string;
  userId: string;
  role: UserRole;
  createdAt: string;
}
