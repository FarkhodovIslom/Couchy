'use client';

import React from 'react';
import { LearningStep, UserRole } from '@kibo/shared';
import OnboardingScreen from '../../components/OnboardingScreen';
import { useRouter } from 'next/navigation';
import { useSession, createSessionData } from '../../lib/SessionProvider';

export default function OnboardingPage() {
  const router = useRouter();
  const { setSession } = useSession();

  const handleStart = (
    sessionId: string,
    steps: LearningStep[],
    name: string,
    role: UserRole,
  ) => {
    const sessionData = createSessionData(sessionId, name, role, steps);
    setSession(sessionData);
    router.push(`/chat/${sessionId}`);
  };

  return <OnboardingScreen onStart={handleStart} />;
}
