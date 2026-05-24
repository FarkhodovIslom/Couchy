'use client';

import React, { useState, useCallback } from 'react';
import { LearningStep } from '@kibo/shared';
import { toggleStep, startSimulation } from '../lib/api';
import { Zap, CheckCircle2, Circle, CircleDot } from 'lucide-react';

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
  const [simulating, setSimulating] = useState(false);

  const handleStartSimulation = async () => {
    setSimulating(true);
    try {
      await startSimulation(sessionId);
      setTimeout(() => setSimulating(false), 2000);
    } catch (err) {
      console.error('Failed to start simulation:', err);
      alert('Ошибка при запуске симуляции.');
      setSimulating(false);
    }
  };

  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;

  // Active step is defined as the first pending (uncompleted) step in the learning path.
  const activeStepIndex = steps.findIndex(s => !s.completed);

  const handleToggle = useCallback(async (stepId: string, current: boolean) => {
    if (!current) {
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
      {/* Progress header (No large title, just minimal label) */}
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
          <span
            className="label"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 500,
            }}
          >
            PROGRESS
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
            }}
          >
            {completedCount} / {totalCount}
          </span>
        </div>
      </div>

      {/* Steps List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {steps.map((step, i) => {
          const isCompleted = step.completed;
          const isActive = i === activeStepIndex;
          const isCompleting = completing === step.id;

          let dotIcon = <Circle size={12} style={{ color: 'var(--text-tertiary)' }} />;
          let textColor = 'var(--text-tertiary)';

          if (isCompleted) {
            dotIcon = <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />;
            textColor = 'var(--text-tertiary)';
          } else if (isActive) {
            dotIcon = <CircleDot size={12} style={{ color: 'var(--accent)' }} />;
            textColor = 'var(--text-primary)';
          }

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
                  flexShrink: 0,
                  width: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: isCompleting ? `step-done var(--dur-slow) var(--ease-spring)` : 'none',
                }}
              >
                {dotIcon}
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
                  fontWeight: isActive ? 500 : 400,
                }}
                title={step.title}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Simulation trigger */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <button
          onClick={handleStartSimulation}
          disabled={simulating}
          style={{
            width: '100%',
            height: '32px',
            backgroundColor: simulating ? 'var(--bg-elevated)' : 'var(--accent)',
            color: simulating ? 'var(--text-secondary)' : '#ffffff',
            border: simulating ? '1px solid var(--border)' : 'none',
            borderRadius: '6px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            cursor: simulating ? 'not-allowed' : 'pointer',
            transition: 'all var(--dur-fast) var(--ease-ios), transform var(--dur-fast) var(--ease-spring)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
          onMouseEnter={e => {
            if (!simulating) e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
          }}
          onMouseLeave={e => {
            if (!simulating) e.currentTarget.style.backgroundColor = 'var(--accent)';
          }}
          onMouseDown={e => {
            if (!simulating) e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={e => {
            if (!simulating) e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Zap size={12} /> {simulating ? 'Запуск...' : 'Запустить симуляцию'}
        </button>
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
        <span
          className="label"
          style={{
            marginBottom: '4px',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Demo
        </span>
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
