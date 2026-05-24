'use client';

import React, { useEffect, useState } from 'react';
import { LearningStep, UserRole } from '@kibo/shared';
import ChatWorkspace from '../../../components/ChatWorkspace';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '../../../lib/SessionProvider';
import { getLearningPath } from '../../../lib/api';

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, isAuthenticated } = useSession();
  const router = useRouter();
  const [steps, setSteps] = useState<LearningStep[]>([]);
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<UserRole>('junior_backend');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Use session context if available and matches
    if (session && session.sessionId === sessionId) {
      setSteps(session.steps);
      setUserName(session.user.name);
      setRole(session.user.role);
      setReady(true);
      return;
    }

    // Fallback: try sessionStorage (legacy) or fetch from API
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
  }, [sessionId, session]);

  if (!ready) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-tertiary)',
        }}
      >
        Loading workspace...
      </div>
    );
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
