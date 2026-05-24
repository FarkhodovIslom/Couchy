'use client';

import React, { useState } from 'react';
import { LearningStep, UserRole } from '@kibo/shared';
import OnboardingScreen from '../../components/OnboardingScreen';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  const handleStart = (
    sessionId: string,
    _steps: LearningStep[],
    _name: string,
    _role: UserRole,
  ) => {
    // Store session in sessionStorage so chat page can pick it up
    sessionStorage.setItem(`session_${sessionId}`, JSON.stringify({ steps: _steps, name: _name, role: _role }));
    router.push(`/chat/${sessionId}`);
  };

  return <OnboardingScreen onStart={handleStart} />;
}
