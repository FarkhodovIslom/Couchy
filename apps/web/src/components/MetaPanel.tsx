'use client';

import React from 'react';
import { ProactiveAlert, GraphNode } from '@couchy/shared';
import AlertCard from './AlertCard';
import GraphNodeCard from './GraphNodeCard';

interface Props {
  alerts: ProactiveAlert[];
  nodes: GraphNode[];
  questionCounts: Record<string, number>;
}

export default function MetaPanel({ alerts, nodes, questionCounts }: Props) {
  return (
    <aside
      style={{
        width: '280px',
        flexShrink: 0,
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className="anim-slide-up"
    >
      {/* Alerts section */}
      <div
        style={{
          flex: alerts.length > 0 ? 'none' : '0 0 auto',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '50%',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="label">Alerts</span>
          {alerts.length > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
              }}
            >
              {alerts.length}
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              marginTop: '4px',
              lineHeight: 1.5,
            }}
          >
            Нет активных уведомлений.
            <br />
            Спросите про UserService или измените сервис.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Graph nodes section */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span className="label" style={{ marginBottom: '8px', display: 'block' }}>
          Knowledge Graph
        </span>

        {nodes.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
            }}
          >
            Загрузка нод...
          </p>
        ) : (
          nodes.map(node => (
            <GraphNodeCard
              key={node.id}
              node={node}
              questionCount={questionCounts[node.id] ?? 0}
            />
          ))
        )}
      </div>
    </aside>
  );
}
