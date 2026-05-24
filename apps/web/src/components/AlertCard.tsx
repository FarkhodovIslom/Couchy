'use client';

import React from 'react';
import { ProactiveAlert } from '@kibo/shared';

interface Props {
  alert: ProactiveAlert;
  onMarkRead?: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, { border: string; bg: string; title: string }> = {
  critical:  { border: 'var(--color-error, #ef4444)',   bg: '#ef444411', title: 'var(--color-error, #ef4444)' },
  warning:   { border: 'var(--color-warning, #f59e0b)', bg: '#f59e0b11', title: 'var(--color-warning, #f59e0b)' },
  info:      { border: 'var(--color-accent, #6366f1)',  bg: '#6366f111', title: 'var(--color-accent, #6366f1)' },
};

const TYPE_SEVERITY: Record<string, string> = {
  dependency_warning: 'warning',
  gap_detected:       'warning',
  breaking_change:    'critical',
  ticket_assigned:    'info',
  context_update:     'info',
};

export default function AlertCard({ alert, onMarkRead }: Props) {
  const severity = alert.severity ?? TYPE_SEVERITY[alert.type] ?? 'info';
  const colors = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.info;

  return (
    <div
      style={{
        borderLeft: `3px solid ${colors.border}`,
        backgroundColor: colors.bg,
        padding: '10px 12px',
        borderRadius: '0 6px 6px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        opacity: alert.read ? 0.55 : 1,
        transition: 'opacity 0.2s ease',
      }}
      className="anim-drop-in"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            color: colors.title,
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {alert.title}
        </span>
        {!alert.read && onMarkRead && (
          <button
            onClick={() => onMarkRead(alert.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 2px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              flexShrink: 0,
              lineHeight: 1,
            }}
            title="Mark as read"
          >
            ×
          </button>
        )}
      </div>

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

      {alert.relatedNodes && alert.relatedNodes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
          {alert.relatedNodes.map((nodeId) => (
            <span
              key={nodeId}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
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
