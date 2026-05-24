'use client';

import React, { useState, useEffect } from 'react';
import { LearningStep, UserRole } from '@kibo/shared';
import ChatWorkspace from '../../../components/ChatWorkspace';
import { useParams } from 'next/navigation';
import { getLearningPath } from '../../../lib/api';

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [steps, setSteps] = useState<LearningStep[]>([]);
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<UserRole>('junior_backend');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`session_${sessionId}`);
    if (stored) {
      const { steps: s, name, role: r } = JSON.parse(stored);
      setSteps(s);
      setUserName(name);
      setRole(r);
      setReady(true);
    } else {
      getLearningPath(sessionId).then((s) => {
        setSteps(s);
        setReady(true);
      });
    }
  }, [sessionId]);

  if (!ready) return null;

  return (
    <ChatWorkspace
      sessionId={sessionId}
      steps={steps}
      userName={userName}
      role={role}
    />
  );
}
