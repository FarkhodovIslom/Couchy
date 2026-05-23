'use client';

import React from 'react';
import { GraphNode } from '@couchy/shared';

interface Props {
  node: GraphNode;
  questionCount?: number;
}

const TYPE_COLORS: Record<string, string> = {
  service:  'var(--text-secondary)',
  spec:     'var(--text-secondary)',
  decision: 'var(--accent)',
  gap:      'var(--gap-color)',
};

export default function GraphNodeCard({ node, questionCount = 0 }: Props) {
  const showBadge = questionCount >= 2;
  const isHot = questionCount >= 3;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Type indicator dot */}
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: TYPE_COLORS[node.type] ?? 'var(--text-tertiary)',
            flexShrink: 0,
          }}
        />
        {/* Node name */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: TYPE_COLORS[node.type] ?? 'var(--text-secondary)',
          }}
        >
          {node.label}
        </span>
      </div>

      {/* Gap badge */}
      {showBadge && (
        <span
          key={questionCount}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            backgroundColor: 'var(--gap-color)',
            color: '#fff',
            borderRadius: '4px',
            padding: '1px 6px',
            opacity: isHot ? 1 : 0.7,
            animation: `badge-pop var(--dur-normal) var(--ease-spring) both`,
          }}
        >
          {questionCount}
        </span>
      )}
    </div>
  );
}
