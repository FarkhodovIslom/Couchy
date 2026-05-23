'use client';

import React from 'react';
import { ProactiveAlert } from '@couchy/shared';

interface Props {
  alert: ProactiveAlert;
}

export default function AlertCard({ alert }: Props) {
  const isGap = alert.type === 'gap_detected';

  const borderColor = isGap ? 'var(--gap-color)' : 'var(--warning)';
  const bgColor     = isGap ? '#FF6B3511' : '#F59E0B11';
  const titleColor  = isGap ? 'var(--gap-color)' : 'var(--warning)';

  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        backgroundColor: bgColor,
        padding: '10px 12px',
        borderRadius: '0 6px 6px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
      className="anim-drop-in"
    >
      {/* Title */}
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          color: titleColor,
          lineHeight: 1.4,
        }}
      >
        {alert.title}
      </span>

      {/* Body */}
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {alert.body}
      </p>

      {/* Related nodes */}
      {alert.relatedNodes && alert.relatedNodes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
          {alert.relatedNodes.map(nodeId => (
            <span
              key={nodeId}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              {nodeId}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
