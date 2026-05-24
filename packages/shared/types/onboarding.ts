export interface LearningStep {
  id: string;
  title: string;
  description: string;
  relatedNodes: string[];
  completed: boolean;
  completedAt?: string;
}

export interface OnboardingStartResponse {
  sessionId: string;
  learningPath: LearningStep[];
  welcomeMessage?: string;
}
