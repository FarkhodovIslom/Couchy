'use client';

import React, { useState, useEffect } from 'react';
import { UserRole, LearningStep } from '@couchy/shared';
import { startOnboarding } from '../lib/api';

interface Props {
  onStart: (sessionId: string, steps: LearningStep[], name: string, role: UserRole) => void;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'junior_backend',  label: 'Junior Backend' },
  { value: 'junior_frontend', label: 'Junior Frontend' },
  { value: 'qa',              label: 'QA Engineer' },
];

export default function OnboardingScreen({ onStart }: Props) {
  const [name, setName]       = useState('Алибек');
  const [role, setRole]       = useState<UserRole>('junior_backend');
  const [loading, setLoading] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animations after mount
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    try {
      const data = await startOnboarding(name.trim(), role);
      // Trigger page exit animation, then switch view
      setExiting(true);
      setTimeout(() => {
        onStart(data.sessionId, data.learningPath, name.trim(), role);
      }, 280);
    } catch {
      alert('Ошибка подключения к API. Убедитесь что NestJS запущен на порту 3001.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-base)',
        padding: '24px',
      }}
      className={exiting ? 'anim-page-exiting' : ''}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          paddingTop: '80px',
        }}
        className={mounted ? 'anim-page-enter' : ''}
      >
        {/* Header */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xl)',
              color: 'var(--text-primary)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}
          >
            Jarvis
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            Выберите роль
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Role cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ROLES.map(({ value, label }, i) => {
              const isSelected = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  style={{
                    '--index': i,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: isSelected ? 'var(--accent-dim)' : 'var(--bg-surface)',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: `border-color var(--dur-normal) var(--ease-ios),
                                 background-color var(--dur-normal) var(--ease-ios),
                                 transform var(--dur-fast) var(--ease-spring)`,
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    animationDelay: `${i * 60}ms`,
                  } as React.CSSProperties}
                  className="anim-spring-in"
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }}
                  onMouseDown={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)';
                  }}
                  onMouseUp={e => {
                    (e.currentTarget as HTMLElement).style.transform = isSelected ? 'scale(1.02)' : 'scale(1)';
                  }}
                >
                  {/* Radio dot */}
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'var(--accent)' : 'var(--text-tertiary)',
                      flexShrink: 0,
                      transition: 'background-color var(--dur-normal) var(--ease-ios)',
                    }}
                  />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Name input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              className="label"
              htmlFor="onboarding-name"
            >
              Имя
            </label>
            <input
              id="onboarding-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Алибек"
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                transition: 'border-color var(--dur-fast) var(--ease-ios)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: loading ? 'var(--bg-elevated)' : 'var(--accent)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: `background-color var(--dur-fast) var(--ease-ios),
                           transform var(--dur-fast) var(--ease-spring)`,
              opacity: loading || !name.trim() ? 0.5 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseLeave={e => {
              if (!loading) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)';
            }}
            onMouseDown={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)';
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {loading ? 'Запуск...' : 'Начать'}
          </button>
        </form>
      </div>
    </div>
  );
}
