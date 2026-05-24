'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/SessionProvider';
import OnboardingScreen from '../components/OnboardingScreen';
import { createSessionData } from '../lib/SessionProvider';
import { LearningStep, UserRole } from '@kibo/shared';

export default function Home() {
  const router = useRouter();
  const { session, setSession, isAuthenticated } = useSession();

  // If already authenticated, redirect to chat
  useEffect(() => {
    if (isAuthenticated && session) {
      router.replace(`/chat/${session.sessionId}`);
    }
  }, [isAuthenticated, session, router]);

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

  if (isAuthenticated) {
    // Show nothing while redirecting
    return null;
  }

  return <OnboardingScreen onStart={handleStart} />;
}
