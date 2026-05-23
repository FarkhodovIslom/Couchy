'use client';

import React from 'react';
import { GraphNode } from '@couchy/shared';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  sources?: GraphNode[];
  isStreaming?: boolean;
}

const SOURCE_TYPE_COLOR: Record<string, string> = {
  spec:     'var(--text-secondary)',
  decision: 'var(--accent)',
  gap:      'var(--gap-color)',
  service:  'var(--text-secondary)',
};

export default function MessageBubble({ role, content, sources, isStreaming }: Props) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }} className="anim-ios-in">
        <div
          style={{
            maxWidth: '70%',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            padding: '10px 14px',
            borderRadius: '12px 12px 2px 12px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  // Agent message — no bubble, prefix + text
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="anim-ios-in">
      {/* Message text with Jarvis prefix */}
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-base)',
          color: 'var(--text-primary)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxWidth: '80%',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            color: 'var(--accent)',
            marginRight: '8px',
          }}
        >
          Jarvis
        </span>
        {content}
        {isStreaming && <span className="streaming-cursor" />}
      </div>

      {/* Sources — appear after done */}
      {!isStreaming && sources && sources.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animationDelay: '100ms',
          }}
          className="anim-slide-up"
        >
          {/* Horizontal rule */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingTop: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}
            >
              sources
            </span>
            <div style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
            {/* Accent badge — count of sources (3rd accent usage) */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                backgroundColor: 'var(--accent-dim)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              {sources.length}
            </span>
          </div>

          {/* Source tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {sources.map((src, i) => (
              <span
                key={src.id}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: SOURCE_TYPE_COLOR[src.type] ?? 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  animation: `ios-in var(--dur-fast) var(--ease-spring) both`,
                  animationDelay: `${150 + i * 60}ms`,
                }}
              >
                [{src.type}]{'  '}{src.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
