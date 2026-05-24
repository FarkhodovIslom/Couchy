'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UserRole, LearningStep } from '@kibo/shared';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface UserProfile {
  name: string;
  role: UserRole;
  avatar: string;    // initials-based
  department: string;
  joinDate: string;
}

export interface SessionData {
  sessionId: string;
  user: UserProfile;
  steps: LearningStep[];
  startedAt: string;
}

interface SessionContextValue {
  session: SessionData | null;
  setSession: (data: SessionData) => void;
  clearSession: () => void;
  updateSteps: (steps: LearningStep[]) => void;
  isAuthenticated: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Mock data helpers                                                          */
/* -------------------------------------------------------------------------- */

const ROLE_DEPARTMENTS: Record<UserRole, string> = {
  junior_backend: 'Backend Engineering',
  junior_frontend: 'Frontend Engineering',
  qa: 'Quality Assurance',
  lead: 'Engineering Leadership',
  sa: 'Architecture',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

const SessionContext = createContext<SessionContextValue>({
  session: null,
  setSession: () => {},
  clearSession: () => {},
  updateSteps: () => {},
  isAuthenticated: false,
});

export function useSession() {
  return useContext(SessionContext);
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'kibo_session';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<SessionData | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSessionState(JSON.parse(stored));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist to sessionStorage on change
  useEffect(() => {
    if (!hydrated) return;
    if (session) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [session, hydrated]);

  const setSession = useCallback((data: SessionData) => {
    setSessionState(data);
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateSteps = useCallback((steps: LearningStep[]) => {
    setSessionState((prev) => (prev ? { ...prev, steps } : null));
  }, []);

  const value: SessionContextValue = {
    session,
    setSession,
    clearSession,
    updateSteps,
    isAuthenticated: !!session,
  };

  // Prevent hydration mismatch — render nothing until client-side
  if (!hydrated) {
    return null;
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/*  Utility: create session from onboarding response                           */
/* -------------------------------------------------------------------------- */

export function createSessionData(
  sessionId: string,
  name: string,
  role: UserRole,
  steps: LearningStep[],
): SessionData {
  return {
    sessionId,
    user: {
      name,
      role,
      avatar: getInitials(name),
      department: ROLE_DEPARTMENTS[role] ?? 'Engineering',
      joinDate: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
    steps,
    startedAt: new Date().toISOString(),
  };
}
