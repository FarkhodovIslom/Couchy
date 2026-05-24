'use client';

import { useState, useCallback } from 'react';
import { LearningStep } from '@kibo/shared';
import { toggleStep } from '../lib/api';

export function useOnboarding(sessionId: string, initialSteps: LearningStep[]) {
  const [steps, setSteps] = useState<LearningStep[]>(initialSteps);

  const toggle = useCallback(
    async (stepId: string, completed: boolean) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, completed } : s)),
      );
      await toggleStep(sessionId, stepId, completed);
    },
    [sessionId],
  );

  const markStepComplete = useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s)),
    );
  }, []);

  return { steps, setSteps, toggle, markStepComplete };
}
