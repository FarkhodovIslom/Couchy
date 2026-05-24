'use client';

import React from 'react';
import { ProactiveAlert, GraphNode } from '@kibo/shared';
import { Package, Ticket, MessageCircle, ArrowUpRight } from 'lucide-react';
import AlertCard from './AlertCard';
import GraphNodeCard from './GraphNodeCard';

interface Props {
  alerts: ProactiveAlert[];
  nodes: GraphNode[];
  questionCounts: Record<string, number>;
  feedEvents: any[];
  onMarkRead?: (alertId: string) => void;
}

const TYPE_SEVERITY_ORDER: Record<string, number> = {
  breaking_change: 0,
  dependency_warning: 1,
  gap_detected: 2,
  ticket_assigned: 3,
  context_update: 4,
};

export default function MetaPanel({ alerts, nodes, questionCounts, feedEvents, onMarkRead }: Props) {
  const unreadCount = alerts.filter((a) => !a.read).length;
  const sortedAlerts = [...alerts].sort(
    (a, b) => (TYPE_SEVERITY_ORDER[a.type] ?? 99) - (TYPE_SEVERITY_ORDER[b.type] ?? 99),
  );
  // Returns true if a commit touches services in our active graph
  const isCommitTouchingGraph = (payload: any) => {
    if (!payload.files) return false;
    const msg = (payload.message ?? '').toLowerCase();
    const filesStr = payload.files.join(' ').toLowerCase();
    return (
      msg.includes('service') ||
      msg.includes('auth') ||
      msg.includes('user') ||
      msg.includes('payment') ||
      msg.includes('gateway') ||
      filesStr.includes('auth') ||
      filesStr.includes('user') ||
      filesStr.includes('payment') ||
      filesStr.includes('gateway')
    );
  };

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
      {/* 1. ALERTS SECTION */}
      <div
        style={{
          flex: '0 0 auto',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '33%',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            ALERTS
          </span>
          {alerts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#fff',
                    backgroundColor: 'var(--color-error, #ef4444)',
                    borderRadius: '999px',
                    padding: '1px 6px',
                    lineHeight: 1.4,
                  }}
                >
                  {unreadCount}
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {alerts.length}
              </span>
            </div>
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
            Запустите симуляцию или спросите про UserService.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onMarkRead={onMarkRead} />
            ))}
          </div>
        )}
      </div>

      {/* 2. ACTIVITY FEED SECTION (New visual P1 panel) */}
      <div
        style={{
          flex: '1 1 0%',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          minHeight: '200px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            ACTIVITY FEED
          </span>
          {feedEvents.length > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--accent)',
                fontWeight: 500,
              }}
            >
              LIVE
            </span>
          )}
        </div>

        {feedEvents.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              marginTop: '4px',
              lineHeight: 1.5,
            }}
          >
            Лента событий пуста.
            <br />
            Нажмите «Запустить симуляцию».
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {feedEvents.map((item, i) => {
              const isHighlight = item.event === 'commit' && isCommitTouchingGraph(item.payload);
              const relativeTime = i === 0 ? 'just now' : `${i * 10}s ago`;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px 10px',
                    backgroundColor: isHighlight ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    border: `1px solid ${isHighlight ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '6px',
                    transition: 'all var(--dur-normal) var(--ease-ios)',
                  }}
                  className="anim-drop-in"
                >
                  {/* Event Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
                        color: isHighlight ? 'var(--accent)' : 'var(--text-secondary)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.event === 'commit' && <><Package size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> commit</>}
                      {item.event === 'ticket' && <><Ticket size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> ticket</>}
                      {item.event === 'pr_comment' && <><MessageCircle size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> pr comment</>}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '10px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {relativeTime}
                    </span>
                  </div>

                  {/* Message / Title */}
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                      fontWeight: isHighlight ? 500 : 400,
                    }}
                  >
                    {item.event === 'commit' && (
                      <>
                        <strong style={{ color: 'var(--text-secondary)' }}>{item.payload.author.split(' ')[0]}:</strong>{' '}
                        "{item.payload.message}"
                      </>
                    )}
                    {item.event === 'ticket' && (
                      <>
                        <strong style={{ color: 'var(--accent)' }}>{item.payload.id}:</strong>{' '}
                        {item.payload.title}
                      </>
                    )}
                    {item.event === 'pr_comment' && (
                      <>
                        <strong style={{ color: 'var(--text-secondary)' }}>{item.payload.author.split(' ')[0]}:</strong>{' '}
                        "{item.payload.comment.slice(0, 50)}…"
                      </>
                    )}
                  </span>

                  {/* Footnote details */}
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.event === 'commit' && item.payload.files.join(' · ')}
                    {item.event === 'ticket' && `Назначен: ${item.payload.assignee} · ${item.payload.relatedService}`}
                    {item.event === 'pr_comment' && `PR ${item.payload.pr} · ${item.payload.relatedService}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. KNOWLEDGE GRAPH SECTION */}
      <div
        style={{
          flex: '0 0 auto',
          maxHeight: '33%',
          padding: '12px 16px 16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span
            className="label"
            style={{
              display: 'block',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 500,
            }}
          >
            KNOWLEDGE GRAPH
          </span>
          <a
            href="/graph"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--accent)',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity var(--dur-fast) var(--ease-ios)',
            }}
            onMouseEnter={(e) => { (e.currentTarget).style.opacity = '0.7'; }}
            onMouseLeave={(e) => { (e.currentTarget).style.opacity = '1'; }}
          >
            Open full graph <ArrowUpRight size={10} style={{ display: 'inline', verticalAlign: '-1px' }} />
          </a>
        </div>

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
