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

/** D3 augments each datum with simulation fields — we extend to keep TS happy */
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
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const NODE_COLORS: Record<string, string> = {
  service:  '#3B82F6',
  spec:     '#4D7C0F',
  gap:      '#C2410C',
  decision: '#8B5CF6',
  person:   '#EC4899',
  ticket:   '#F59E0B',
};

const NODE_LABELS: Record<string, string> = {
  service:  'Service',
  spec:     'Spec',
  gap:      'Gap',
  decision: 'Decision',
  person:   'Person',
  ticket:   'Ticket',
};

const LEGEND_TYPES = Object.keys(NODE_COLORS);

function nodeRadius(node: GraphNode): number {
  if (!node.weight) return 20;
  return Math.max(16, Math.min(32, 16 + node.weight * 2));
}

function nodeColor(node: GraphNode): string {
  return NODE_COLORS[node.type] ?? '#6E6E7A';
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function KnowledgeGraph({
  nodes,
  edges,
  highlightedNodeIds,
  onNodeClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);
  const dimensionsRef = useRef({ width: 900, height: 600 });

  /* ======================================================================== */
  /*  Empty state                                                              */
  /* ======================================================================== */

  if (!nodes.length) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
        }}
      >
        Knowledge Graph is empty
      </div>
    );
  }

  /* ======================================================================== */
  /*  D3 initialisation                                                        */
  /* ======================================================================== */

  // We use useCallback so the effect closure captures the freshest props
  // but the actual D3 work only runs once per data change.
  const initGraph = useCallback(() => {
    const svgEl = svgRef.current;
    const container = containerRef.current;
    if (!svgEl || !container) return;

    const svg = d3.select(svgEl);

    // Measure
    const { width, height } = container.getBoundingClientRect();
    dimensionsRef.current = { width, height };

    // Clear previous
    svg.selectAll('*').remove();
    if (simulationRef.current) simulationRef.current.stop();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    /* ---- Defs: arrow marker, drop shadow, glow ---- */
    const defs = svg.append('defs');

    // Arrow marker
    defs
      .append('marker')
      .attr('id', 'kg-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#C8C8D0');

    // Drop shadow filter
    const dropShadow = defs
      .append('filter')
      .attr('id', 'kg-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    dropShadow
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 2)
      .attr('stdDeviation', 4)
      .attr('flood-color', 'rgba(0,0,0,0.12)');

    // Hover glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'kg-glow')
      .attr('x', '-80%')
      .attr('y', '-80%')
      .attr('width', '260%')
      .attr('height', '260%');
    glowFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', 6)
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Highlight pulse filter (green glow)
    const pulseFilter = defs
      .append('filter')
      .attr('id', 'kg-pulse-glow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%');
    pulseFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', 8)
      .attr('result', 'pulseBlur');
    const pulseMerge = pulseFilter.append('feMerge');
    pulseMerge.append('feMergeNode').attr('in', 'pulseBlur');
    pulseMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    /* ---- Zoom group ---- */
    const g = svg.append('g').attr('class', 'kg-zoom-group');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Center initial view
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(0, 0).scale(1),
    );

    /* ---- Prepare data (deep copy to avoid mutating props) ---- */
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simEdges: SimEdge[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      weight: e.weight,
      id: e.id,
    }));

    const highlightSet = new Set(highlightedNodeIds ?? []);

    /* ---- Draw edges (lines) ---- */
    const edgeGroup = g.append('g').attr('class', 'kg-edges');

    const linkLines = edgeGroup
      .selectAll<SVGLineElement, SimEdge>('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', '#C8C8D0')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => 1 + Math.min(d.weight, 4))
      .attr('marker-end', 'url(#kg-arrow)');

    /* ---- Edge labels ---- */
    const edgeLabelGroup = g.append('g').attr('class', 'kg-edge-labels');

    const edgeLabels = edgeLabelGroup
      .selectAll<SVGTextElement, SimEdge>('text')
      .data(simEdges)
      .join('text')
      .text((d) => d.relation)
      .attr('font-size', '9px')
      .attr('font-family', 'var(--font-sans)')
      .attr('fill', '#6E6E7A')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .attr('pointer-events', 'none');

    /* ---- Draw nodes (groups) ---- */
    const nodeGroup = g.append('g').attr('class', 'kg-nodes');

    const nodeGs = nodeGroup
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .style('transition', 'opacity 0.2s ease');

    // Highlight pulse ring (hidden by default, visible for highlighted nodes)
    nodeGs
      .filter((d) => highlightSet.has(d.id))
      .append('circle')
      .attr('class', 'kg-pulse-ring')
      .attr('r', (d) => nodeRadius(d) + 8)
      .attr('fill', 'none')
      .attr('stroke', '#4D7C0F')
      .attr('stroke-width', 2.5)
      .attr('opacity', 0)
      .each(function () {
        // SVG animate for the pulsing glow
        const animate1 = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'animate',
        );
        animate1.setAttribute('attributeName', 'opacity');
        animate1.setAttribute('values', '0;0.8;0');
        animate1.setAttribute('dur', '2s');
        animate1.setAttribute('repeatCount', 'indefinite');
        this.appendChild(animate1);

        const animate2 = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'animate',
        );
        animate2.setAttribute('attributeName', 'r');
        const r = parseFloat(this.getAttribute('r') ?? '28');
        animate2.setAttribute('values', `${r};${r + 6};${r}`);
        animate2.setAttribute('dur', '2s');
        animate2.setAttribute('repeatCount', 'indefinite');
        this.appendChild(animate2);
      });

    // Main circle
    nodeGs
      .append('circle')
      .attr('class', 'kg-node-circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => nodeColor(d))
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#kg-shadow)');

    // Inner icon dot (subtle)
    nodeGs
      .append('circle')
      .attr('r', 3)
      .attr('fill', 'rgba(255,255,255,0.6)')
      .attr('pointer-events', 'none');

    // Node label
    nodeGs
      .append('text')
      .text((d) => d.label)
      .attr('dy', (d) => nodeRadius(d) + 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'var(--font-sans)')
      .attr('fill', 'var(--text-secondary)')
      .attr('font-weight', 500)
      .attr('pointer-events', 'none');

    /* ---- Interactions ---- */

    // Hover
    nodeGs
      .on('mouseenter', function (_event, d) {
        const connected = new Set<string>();
        simEdges.forEach((e) => {
          const src = typeof e.source === 'string' ? e.source : (e.source as SimNode).id;
          const tgt = typeof e.target === 'string' ? e.target : (e.target as SimNode).id;
          if (src === d.id) connected.add(tgt);
          if (tgt === d.id) connected.add(src);
        });
        connected.add(d.id);

        // Dim non-connected nodes
        nodeGs.style('opacity', (n) =>
          connected.has(n.id) ? '1' : '0.2',
        );

        // Highlight connected edges
        linkLines
          .attr('stroke-opacity', (e) => {
            const src = typeof e.source === 'string' ? e.source : (e.source as SimNode).id;
            const tgt = typeof e.target === 'string' ? e.target : (e.target as SimNode).id;
            return src === d.id || tgt === d.id ? 1 : 0.08;
          })
          .attr('stroke', (e) => {
            const src = typeof e.source === 'string' ? e.source : (e.source as SimNode).id;
            const tgt = typeof e.target === 'string' ? e.target : (e.target as SimNode).id;
            return src === d.id || tgt === d.id ? nodeColor(d) : '#C8C8D0';
          });

        edgeLabels.attr('opacity', (e) => {
          const src = typeof e.source === 'string' ? e.source : (e.source as SimNode).id;
          const tgt = typeof e.target === 'string' ? e.target : (e.target as SimNode).id;
          return src === d.id || tgt === d.id ? 1 : 0.1;
        });

        // Glow on hovered node
        d3.select(this)
          .select('.kg-node-circle')
          .attr('filter', 'url(#kg-glow)')
          .attr('stroke-width', 3.5);
      })
      .on('mouseleave', function () {
        nodeGs.style('opacity', '1');
        linkLines.attr('stroke-opacity', 0.6).attr('stroke', '#C8C8D0');
        edgeLabels.attr('opacity', 1);
        d3.select(this)
          .select('.kg-node-circle')
          .attr('filter', 'url(#kg-shadow)')
          .attr('stroke-width', 2.5);
      });

    // Click
    nodeGs.on('click', (_event, d) => {
      if (onNodeClick) onNodeClick(d as GraphNode);
    });

    /* ---- Drag ---- */
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGs.call(drag);

    /* ---- Force simulation ---- */
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(120),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<SimNode>().radius(40))
      .on('tick', () => {
        linkLines
          .attr('x1', (d) => (d.source as SimNode).x ?? 0)
          .attr('y1', (d) => (d.source as SimNode).y ?? 0)
          .attr('x2', (d) => (d.target as SimNode).x ?? 0)
          .attr('y2', (d) => (d.target as SimNode).y ?? 0);

        edgeLabels
          .attr('x', (d) => {
            const sx = (d.source as SimNode).x ?? 0;
            const tx = (d.target as SimNode).x ?? 0;
            return (sx + tx) / 2;
          })
          .attr('y', (d) => {
            const sy = (d.source as SimNode).y ?? 0;
            const ty = (d.target as SimNode).y ?? 0;
            return (sy + ty) / 2;
          });

        nodeGs.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simulationRef.current = simulation;

    /* ---- Legend ---- */
    const legendG = svg
      .append('g')
      .attr('class', 'kg-legend')
      .attr('transform', `translate(20, ${height - LEGEND_TYPES.length * 22 - 20})`);

    // Legend backdrop
    legendG
      .append('rect')
      .attr('x', -10)
      .attr('y', -10)
      .attr('width', 110)
      .attr('height', LEGEND_TYPES.length * 22 + 12)
      .attr('rx', 8)
      .attr('fill', 'var(--bg-surface)')
      .attr('fill-opacity', 0.85)
      .attr('stroke', 'var(--border-subtle)')
      .attr('stroke-width', 1);

    LEGEND_TYPES.forEach((type, i) => {
      const row = legendG.append('g').attr('transform', `translate(0, ${i * 22})`);
      row
        .append('circle')
        .attr('r', 5)
        .attr('cx', 5)
        .attr('cy', 5)
        .attr('fill', NODE_COLORS[type]);
      row
        .append('text')
        .attr('x', 18)
        .attr('y', 9)
        .text(NODE_LABELS[type])
        .attr('font-size', '10px')
        .attr('font-family', 'var(--font-sans)')
        .attr('fill', 'var(--text-secondary)');
    });

    /* ---- Entrance animation ---- */
    // Fade in the whole graph
    g.attr('opacity', 0)
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);
  }, [nodes, edges, highlightedNodeIds, onNodeClick]);

  /* ======================================================================== */
  /*  Effect — init & resize                                                   */
  /* ======================================================================== */

  useEffect(() => {
    initGraph();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      initGraph();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [initGraph]);

  /* ======================================================================== */
  /*  Render                                                                   */
  /* ======================================================================== */

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
      }}
    >
      <svg
        ref={svgRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      />
    </div>
  );
}
