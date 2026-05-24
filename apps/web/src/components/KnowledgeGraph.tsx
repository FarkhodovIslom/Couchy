'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge } from '@kibo/shared';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedNodeIds?: string[];
  onNodeClick?: (node: GraphNode) => void;
}

interface SimNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimEdge {
  source: SimNode | string;
  target: SimNode | string;
  relation: string;
  weight: number;
  id?: string;
}

/* -------------------------------------------------------------------------- */
/*  Obsidian-style palette                                                     */
/* -------------------------------------------------------------------------- */

const NODE_COLORS: Record<string, string> = {
  service:  '#60A5FA',  // soft blue
  spec:     '#86EFAC',  // soft green
  gap:      '#FB923C',  // warm orange
  decision: '#C084FC',  // soft purple
  person:   '#F472B6',  // pink
  ticket:   '#FCD34D',  // gold
};

const NODE_GLOW: Record<string, string> = {
  service:  'rgba(96,165,250,0.6)',
  spec:     'rgba(134,239,172,0.5)',
  gap:      'rgba(251,146,60,0.5)',
  decision: 'rgba(192,132,252,0.5)',
  person:   'rgba(244,114,182,0.5)',
  ticket:   'rgba(252,211,77,0.5)',
};

const NODE_LABELS: Record<string, string> = {
  service: 'Service', spec: 'Spec', gap: 'Gap',
  decision: 'Decision', person: 'Person', ticket: 'Ticket',
};

const LEGEND_TYPES = Object.keys(NODE_COLORS);

const BG_COLOR = '#0B0D13';
const LINE_COLOR = 'rgba(100,120,160,0.15)';
const LINE_HOVER = 'rgba(100,120,160,0.55)';

function nodeRadius(node: GraphNode): number {
  if (!node.weight) return 6;
  return Math.max(4, Math.min(14, 4 + node.weight * 1.5));
}

function nodeColor(node: GraphNode): string {
  return NODE_COLORS[node.type] ?? '#6E7A8A';
}

function nodeGlow(node: GraphNode): string {
  return NODE_GLOW[node.type] ?? 'rgba(110,122,138,0.4)';
}

/* -------------------------------------------------------------------------- */
/*  Particles system (background floating dots)                                */
/* -------------------------------------------------------------------------- */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; opacity: number;
}

function createParticles(w: number, h: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.4,
      opacity: Math.random() * 0.3 + 0.08,
    });
  }
  return particles;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function KnowledgeGraph({ nodes, edges, highlightedNodeIds, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const dimensionsRef = useRef({ width: 900, height: 600 });
  const transformRef = useRef(d3.zoomIdentity);
  const simNodesRef = useRef<SimNode[]>([]);
  const simEdgesRef = useRef<SimEdge[]>([]);

  /* ---- Empty state ---- */
  if (!nodes.length) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: BG_COLOR,
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.06em',
        }}
      >
        Knowledge Graph is empty
      </div>
    );
  }

  /* ==================================================================== */
  /*  Initialization                                                       */
  /* ==================================================================== */

  const initGraph = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const { width, height } = container.getBoundingClientRect();
    dimensionsRef.current = { width, height };
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Stop previous
    if (simulationRef.current) simulationRef.current.stop();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    // Particles
    particlesRef.current = createParticles(width, height, Math.min(80, Math.floor(width * height / 12000)));

    // Data copies
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simEdges: SimEdge[] = edges.map((e) => ({
      source: e.source, target: e.target,
      relation: e.relation, weight: e.weight, id: e.id,
    }));
    simNodesRef.current = simNodes;
    simEdgesRef.current = simEdges;

    const highlightSet = new Set(highlightedNodeIds ?? []);

    /* ---- Simulation ---- */
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimEdge>(simEdges).id((d) => d.id).distance(100).strength(0.4))
      .force('charge', d3.forceManyBody<SimNode>().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<SimNode>().radius(20))
      .alphaDecay(0.01)
      .velocityDecay(0.3);

    simulationRef.current = simulation;

    /* ---- Render loop ---- */
    let tick = 0;

    function render() {
      const w = dimensionsRef.current.width;
      const h = dimensionsRef.current.height;
      const transform = transformRef.current;
      tick++;

      ctx.clearRect(0, 0, w, h);

      // BG
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      // ---- Particles ----
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,140,180,${p.opacity})`;
        ctx.fill();
      }

      // Apply zoom transform
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      const hovered = hoveredRef.current;
      const connectedToHovered = new Set<string>();
      if (hovered) {
        for (const e of simEdges) {
          const src = typeof e.source === 'string' ? e.source : e.source.id;
          const tgt = typeof e.target === 'string' ? e.target : e.target.id;
          if (src === hovered) connectedToHovered.add(tgt);
          if (tgt === hovered) connectedToHovered.add(src);
        }
        connectedToHovered.add(hovered);
      }

      // ---- Edges ----
      for (const e of simEdges) {
        const src = e.source as SimNode;
        const tgt = e.target as SimNode;
        if (src.x == null || tgt.x == null) continue;

        const srcId = src.id;
        const tgtId = tgt.id;
        const isConnected = hovered && (srcId === hovered || tgtId === hovered);

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (hovered) {
          ctx.strokeStyle = isConnected ? LINE_HOVER : 'rgba(50,60,80,0.06)';
          ctx.lineWidth = isConnected ? 1.5 : 0.5;
        } else {
          ctx.strokeStyle = LINE_COLOR;
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();

        // Edge label (only on hover)
        if (isConnected && e.relation) {
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y + tgt.y) / 2;
          ctx.font = `${9 / transform.k}px var(--font-sans)`;
          ctx.fillStyle = 'rgba(180,190,210,0.7)';
          ctx.textAlign = 'center';
          ctx.fillText(e.relation, mx, my - 4);
        }
      }

      // ---- Nodes ----
      for (const node of simNodes) {
        if (node.x == null || node.y == null) continue;

        const r = nodeRadius(node);
        const color = nodeColor(node);
        const glow = nodeGlow(node);
        const isHov = hovered === node.id;
        const isConnected = connectedToHovered.has(node.id);
        const isHighlighted = highlightSet.has(node.id);
        const dimmed = hovered && !isConnected;

        // Glow layer
        if (!dimmed) {
          const glowR = isHov ? r * 5 : isHighlighted ? r * 4 + Math.sin(tick * 0.04) * r : r * 2.5;
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
          gradient.addColorStop(0, glow);
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Core circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = dimmed ? 'rgba(60,70,90,0.3)' : color;
        ctx.fill();

        if (isHov) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Label — show on hover or if highlighted or zoom > 1.5
        if (isHov || isConnected || isHighlighted || transform.k > 1.5) {
          const fontSize = Math.max(10, 11 / transform.k);
          ctx.font = `500 ${fontSize}px var(--font-sans)`;
          ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.85)';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y + r + fontSize + 2);
        }
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    }

    simulation.on('tick', () => {});
    animFrameRef.current = requestAnimationFrame(render);

    /* ---- Zoom ---- */
    const zoomBehavior = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 6])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
      });

    d3.select(canvas).call(zoomBehavior);

    /* ---- Drag & Hover ---- */
    function getNodeAt(mx: number, my: number): SimNode | null {
      const t = transformRef.current;
      const px = (mx - t.x) / t.k;
      const py = (my - t.y) / t.k;

      for (let i = simNodes.length - 1; i >= 0; i--) {
        const n = simNodes[i];
        if (n.x == null || n.y == null) continue;
        const dx = px - n.x;
        const dy = py - n.y;
        const hitR = Math.max(nodeRadius(n), 12);
        if (dx * dx + dy * dy < hitR * hitR) return n;
      }
      return null;
    }

    let dragNode: SimNode | null = null;

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (dragNode) {
        const t = transformRef.current;
        dragNode.fx = (mx - t.x) / t.k;
        dragNode.fy = (my - t.y) / t.k;
        simulation.alpha(0.3).restart();
        return;
      }

      const node = getNodeAt(mx, my);
      hoveredRef.current = node?.id ?? null;
      canvas.style.cursor = node ? 'pointer' : 'grab';
    };

    canvas.onmousedown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (node) {
        dragNode = node;
        const t = transformRef.current;
        node.fx = (e.clientX - rect.left - t.x) / t.k;
        node.fy = (e.clientY - rect.top - t.y) / t.k;
        simulation.alphaTarget(0.3).restart();
        // Prevent zoom during drag
        d3.select(canvas).on('.zoom', null);
        e.preventDefault();
      }
    };

    canvas.onmouseup = () => {
      if (dragNode) {
        dragNode.fx = null;
        dragNode.fy = null;
        simulation.alphaTarget(0);
        dragNode = null;
        // Re-enable zoom
        d3.select(canvas).call(zoomBehavior);
      }
    };

    canvas.onclick = (e) => {
      if (!onNodeClick) return;
      const rect = canvas.getBoundingClientRect();
      const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (node) onNodeClick(node as GraphNode);
    };

    canvas.onmouseleave = () => {
      hoveredRef.current = null;
      if (dragNode) {
        dragNode.fx = null;
        dragNode.fy = null;
        simulation.alphaTarget(0);
        dragNode = null;
        d3.select(canvas).call(zoomBehavior);
      }
    };
  }, [nodes, edges, highlightedNodeIds, onNodeClick]);

  /* ==================================================================== */
  /*  Effects                                                              */
  /* ==================================================================== */

  useEffect(() => {
    initGraph();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => initGraph());
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (simulationRef.current) simulationRef.current.stop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [initGraph]);

  /* ==================================================================== */
  /*  Render                                                               */
  /* ==================================================================== */

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
        backgroundColor: BG_COLOR,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          backgroundColor: 'rgba(11,13,19,0.85)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '10px 14px',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {LEGEND_TYPES.map((type) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: NODE_COLORS[type],
                boxShadow: `0 0 6px ${NODE_GLOW[type]}`,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.04em',
              }}
            >
              {NODE_LABELS[type]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
