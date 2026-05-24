'use client';

import React from 'react';
import { useReport } from '../hooks/useReport';
import { useAlerts } from '../hooks/useAlerts';

interface Props {
  sessionId: string;
}

const severityColor: Record<string, string> = {
  gap_detected: 'var(--color-warning)',
  dependency_warning: 'var(--color-error)',
  context_update: 'var(--color-accent)',
  breaking_change: 'var(--color-error)',
  ticket_assigned: 'var(--color-success)',
};

export default function LeadReport({ sessionId }: Props) {
  const { report, loading } = useReport(sessionId);
  const { alerts } = useAlerts(sessionId);

  if (loading) {
    return (
      <div style={{ padding: '32px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
        Loading report…
      </div>
    );
  }

  if (!report) return null;

  return (
    <div style={{ padding: '32px', maxWidth: '720px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: '24px' }}>
        Lead Report
      </h1>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Alerts', value: report.totalAlerts },
          { label: 'Unread', value: report.unreadAlerts },
          { label: 'Gap Nodes', value: report.gapNodes.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              flex: '1 1 140px',
              padding: '16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              {label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts by type */}
      {Object.keys(report.alertsByType).length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            By Type
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(report.alertsByType).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: severityColor[type] ?? 'var(--text-tertiary)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{type.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top gap nodes */}
      {report.gapNodes.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            Knowledge Gaps
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.gapNodes.map(({ nodeId, count }) => (
              <div key={nodeId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{nodeId}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', fontWeight: 600 }}>{count}× asked</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent alerts */}
      {alerts.length > 0 && (
        <section>
          <h2 style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            Recent Alerts
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${alert.read ? 'var(--border)' : severityColor[alert.type] ?? 'var(--border)'}`,
                  borderRadius: '6px',
                  opacity: alert.read ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>{alert.title}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{alert.body}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
