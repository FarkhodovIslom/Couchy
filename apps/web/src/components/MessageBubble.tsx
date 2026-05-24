'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GraphNode } from '@kibo/shared';
import TypingIndicator from './TypingIndicator';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  sources?: GraphNode[];
  isStreaming?: boolean;
  isThinking?: boolean;
}

const SOURCE_TYPE_COLOR: Record<string, string> = {
  spec:     'var(--text-secondary)',
  decision: 'var(--accent)',
  gap:      'var(--gap-color)',
  service:  'var(--text-secondary)',
};

export default function MessageBubble({ role, content, sources, isStreaming, isThinking }: Props) {
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
            wordBreak: 'break-word',
          }}
          className="markdown-content"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // Agent message — no bubble, flat text, prefix + text
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="anim-ios-in">
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-base)',
          color: 'var(--text-primary)',
          lineHeight: 1.7,
          wordBreak: 'break-word',
          maxWidth: '80%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--accent)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginTop: '2px',
              fontWeight: 500,
            }}
          >
            Kibo
          </span>
          <div className="markdown-content" style={{ flex: 1 }}>
            {isThinking && !content ? (
              <TypingIndicator />
            ) : (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                {isStreaming && !isThinking && <span className="streaming-cursor" />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sources — appear after done */}
      {!isStreaming && sources && sources.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animationDelay: '100ms',
            marginTop: '8px',
          }}
          className="anim-slide-up"
        >
          {/* Horizontal rule with label and Lime count badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
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
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                backgroundColor: 'var(--accent-dim)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: '4px',
                padding: '1px 6px',
                fontWeight: 500,
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
