export interface LearningStep {
  id: string;
  title: string;
  description: string;
  relatedNodes: string[];
  completed: boolean;
}

export interface OnboardingStartResponse {
  sessionId: string;
  learningPath: LearningStep[];
}
