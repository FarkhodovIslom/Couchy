'use client';

import React, { useState, useCallback } from 'react';
import { LearningStep } from '@couchy/shared';
import { toggleStep } from '../lib/api';

interface Props {
  sessionId: string;
  steps: LearningStep[];
  onStepsChange: (steps: LearningStep[]) => void;
  onAskQuestion: (q: string) => void;
}

const DEMO_QUESTIONS = [
  'Почему в AuthService используется JWT а не сессии?',
  'Я изменил UserService',
  'Почему JWT а не сессии?',
];

export default function LearningPath({ sessionId, steps, onStepsChange, onAskQuestion }: Props) {
  const [completing, setCompleting] = useState<string | null>(null);

  const completed = steps.filter(s => s.completed).length;
  const total = steps.length;

  const handleToggle = useCallback(async (stepId: string, current: boolean) => {
    if (!current) {
      // Trigger dot animation
      setCompleting(stepId);
      setTimeout(() => setCompleting(null), 420);
    }
    const next = steps.map(s => s.id === stepId ? { ...s, completed: !current } : s);
    onStepsChange(next);
    await toggleStep(sessionId, stepId, !current);
  }, [steps, sessionId, onStepsChange]);

  return (
    <aside
      style={{
        width: '240px',
        flexShrink: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className="anim-slide-up"
    >
      {/* Progress header */}
      <div
        style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="label">Progress</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
            }}
          >
            {completed} / {total}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {steps.map((step, i) => {
          const isCompleted = step.completed;
          const isCompleting = completing === step.id;

          let dotChar = '○';
          let dotColor = 'var(--text-tertiary)';
          let textColor = 'var(--text-tertiary)';

          if (isCompleted) {
            dotChar = '✓';
            dotColor = 'var(--success)';
            textColor = 'var(--text-tertiary)';
          }
          // Note: "active" concept removed per DesignSpec — just completed/pending
          // The agent prefix "Jarvis" in chat serves as the active indicator

          return (
            <div
              key={step.id}
              onClick={() => handleToggle(step.id, isCompleted)}
              style={{
                '--index': i,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '36px',
                padding: '0 16px',
                cursor: 'pointer',
                transition: 'background-color var(--dur-fast) var(--ease-ios)',
                animationDelay: `${i * 60}ms`,
              } as React.CSSProperties}
              className="anim-ios-in"
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              {/* Dot indicator */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: dotColor,
                  flexShrink: 0,
                  width: '12px',
                  textAlign: 'center',
                  display: 'inline-block',
                  animation: isCompleting ? `step-done var(--dur-slow) var(--ease-spring)` : 'none',
                }}
              >
                {dotChar}
              </span>

              {/* Step title */}
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: textColor,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                }}
                title={step.title}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Demo questions */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <span className="label" style={{ marginBottom: '4px' }}>Demo</span>
        {DEMO_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => onAskQuestion(q)}
            style={{
              width: '100%',
              padding: '7px 10px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: `background-color var(--dur-fast) var(--ease-ios),
                           color var(--dur-fast) var(--ease-ios)`,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'var(--bg-base)';
              el.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'var(--bg-elevated)';
              el.style.color = 'var(--text-secondary)';
            }}
          >
            {i + 1}. {q.length > 36 ? q.slice(0, 36) + '…' : q}
          </button>
        ))}
      </div>
    </aside>
  );
}
