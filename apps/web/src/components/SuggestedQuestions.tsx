'use client';

import React from 'react';

interface Props {
  suggestions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ suggestions, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        paddingLeft: '48px',
        marginTop: '-8px',
      }}
      className="anim-slide-up"
    >
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          width: '100%',
          marginBottom: '2px',
        }}
      >
        suggested
      </span>
      {suggestions.map((q, i) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            color: 'var(--accent)',
            backgroundColor: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            borderRadius: '999px',
            padding: '6px 14px',
            cursor: 'pointer',
            lineHeight: 1.4,
            transition: `all var(--dur-fast) var(--ease-ios)`,
            animation: `ios-slide-up var(--dur-normal) var(--ease-spring) both`,
            animationDelay: `${100 + i * 80}ms`,
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = 'var(--accent)';
            el.style.color = '#ffffff';
            el.style.transform = 'scale(1.03)';
            el.style.boxShadow = '0 2px 12px var(--accent-dim)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = 'var(--accent-dim)';
            el.style.color = 'var(--accent)';
            el.style.transform = 'scale(1)';
            el.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            (e.currentTarget).style.transform = 'scale(0.96)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget).style.transform = 'scale(1.03)';
          }}
          title={q}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
