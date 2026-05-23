'use client';

import React, { useState } from 'react';
import { LearningStep, UserRole } from '@couchy/shared';
import OnboardingScreen from '../components/OnboardingScreen';
import ChatWorkspace from '../components/ChatWorkspace';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [steps, setSteps]         = useState<LearningStep[]>([]);
  const [userName, setUserName]   = useState('');
  const [role, setRole]           = useState<UserRole>('junior_backend');

  const handleStart = (
    sid: string,
    learningPath: LearningStep[],
    name: string,
    r: UserRole,
  ) => {
    setSessionId(sid);
    setSteps(learningPath);
    setUserName(name);
    setRole(r);
  };

  if (!sessionId) {
    return <OnboardingScreen onStart={handleStart} />;
  }

  return (
    <ChatWorkspace
      sessionId={sessionId}
      steps={steps}
      userName={userName}
      role={role}
    />
  );
}
