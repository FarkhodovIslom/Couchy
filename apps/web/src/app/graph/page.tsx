'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GraphNode, GraphEdge } from '@kibo/shared';
import { getGraphSnapshot } from '../../lib/api';
import KnowledgeGraph from '../../components/KnowledgeGraph';

/* -------------------------------------------------------------------------- */
/*  Node type badge colors (matches KnowledgeGraph)                            */
/* -------------------------------------------------------------------------- */

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  service:  { bg: 'rgba(59,130,246,0.12)',  text: '#3B82F6' },
  spec:     { bg: 'rgba(77,124,15,0.12)',   text: '#4D7C0F' },
  gap:      { bg: 'rgba(194,65,12,0.12)',   text: '#C2410C' },
  decision: { bg: 'rgba(139,92,246,0.12)',  text: '#8B5CF6' },
  person:   { bg: 'rgba(236,72,153,0.12)',  text: '#EC4899' },
  ticket:   { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B' },
};

/* -------------------------------------------------------------------------- */
/*  Inner component that uses useSearchParams (must be inside Suspense)        */
/* -------------------------------------------------------------------------- */

function GraphPageInner() {
  const searchParams = useSearchParams();

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  /* ------ highlighted nodes from URL ------ */
  const highlightParam = searchParams.get('highlight') ?? '';
  const highlightedNodeIds = highlightParam
    ? highlightParam.split(',').map((s: string) => s.trim())
    : undefined;

  /* ------ Fetch data ------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getGraphSnapshot();
        if (!cancelled) {
          setNodes(data.nodes);
          setEdges(data.edges);
        }
      } catch {
        // silently handle — the graph will show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------ Node click handler ------ */
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  /* ------ Close popover ------ */
  const closePopover = useCallback(() => setSelectedNode(null), []);

  /* ==================================================================== */
  /*  Render                                                               */
  /* ==================================================================== */

  return (
    <div
      className="anim-page-enter"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* ---- Top Bar ---- */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          padding: '0 24px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        {/* Left: Back link */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
          Back
        </Link>

        {/* Center: Title */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        >
          Knowledge Graph
        </span>

        {/* Right: Stats badge */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.02em',
          }}
        >
          {loading ? '...' : `${nodes.length} nodes · ${edges.length} edges`}
        </span>
      </header>

      {/* ---- Main Area ---- */}
      <main
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
        }}
      >
        {loading ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-tertiary)',
                animation: 'ios-cursor 1.5s ease-in-out infinite',
              }}
            >
              Loading graph...
            </span>
          </div>
        ) : (
          <KnowledgeGraph
            nodes={nodes}
            edges={edges}
            highlightedNodeIds={highlightedNodeIds}
            onNodeClick={handleNodeClick}
          />
        )}

        {/* ---- Node Popover ---- */}
        {selectedNode && (
          <div
            className="anim-spring-in"
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 300,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)',
              zIndex: 50,
            }}
          >
            {/* Close button */}
            <button
              onClick={closePopover}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              ✕
            </button>

            {/* Node label */}
            <h3
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-base)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8,
                paddingRight: 32,
                lineHeight: 1.3,
              }}
            >
              {selectedNode.label}
            </h3>

            {/* Type badge */}
            <span
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                padding: '2px 10px',
                borderRadius: 20,
                backgroundColor:
                  TYPE_BADGE_COLORS[selectedNode.type]?.bg ?? 'var(--bg-elevated)',
                color:
                  TYPE_BADGE_COLORS[selectedNode.type]?.text ?? 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 14,
              }}
            >
              {selectedNode.type}
            </span>

            {/* Description */}
            {selectedNode.metadata?.description && (
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginTop: 8,
                }}
              >
                {selectedNode.metadata.description}
              </p>
            )}

            {/* Metadata entries */}
            {selectedNode.metadata &&
              Object.entries(selectedNode.metadata).filter(
                ([key]) => key !== 'description',
              ).length > 0 && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  {Object.entries(selectedNode.metadata)
                    .filter(([key]) => key !== 'description')
                    .map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {key}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-secondary)',
                            maxWidth: '60%',
                            textAlign: 'right',
                            wordBreak: 'break-word',
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                </div>
              )}

            {/* Node ID (subtle footer) */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 10,
                borderTop: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                opacity: 0.6,
              }}
            >
              id: {selectedNode.id}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page export — Suspense boundary for useSearchParams                        */
/* -------------------------------------------------------------------------- */

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-base)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
          }}
        >
          Loading...
        </div>
      }
    >
      <GraphPageInner />
    </Suspense>
  );
}
