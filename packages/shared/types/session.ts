export type UserRole = 'junior_backend' | 'junior_frontend' | 'qa' | 'lead' | 'sa';

export interface Session {
  sessionId: string;
  userId: string;
  name?: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}
