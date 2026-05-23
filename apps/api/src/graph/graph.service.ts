import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { GraphNode, GraphEdge } from '@couchy/shared';

@Injectable()
export class GraphService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GraphService.name);
  private db: Database.Database;

  constructor() {
    const dbPath = path.resolve(
      process.cwd(),
      process.env.GRAPH_DB_PATH ?? '../../graph.db',
    );

    // Ensure parent directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    // WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL');
    this.logger.log(`GraphService DB initialized at: ${dbPath}`);
  }

  onModuleInit() {
    this.initSchema();
    this.seedData();
  }

  onModuleDestroy() {
    this.db.close();
  }

  // ---------------------------------------------------------------------------
  // Schema
  // ---------------------------------------------------------------------------

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id        TEXT PRIMARY KEY,
        label     TEXT NOT NULL,
        type      TEXT NOT NULL CHECK(type IN ('service', 'spec', 'gap', 'decision')),
        metadata  TEXT DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS edges (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        source    TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        target    TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        relation  TEXT NOT NULL,
        weight    INTEGER NOT NULL DEFAULT 1,
        UNIQUE(source, target, relation)
      );

      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
    `);

    this.logger.log('Knowledge Graph schema ready.');
  }

  // ---------------------------------------------------------------------------
  // Seed Data
  // ---------------------------------------------------------------------------

  private seedData() {
    const seedNodes: GraphNode[] = [
      { id: 'AuthService',  label: 'AuthService',  type: 'service',  metadata: { description: 'Микросервис аутентификации. Выдаёт и валидирует JWT токены.' } },
      { id: 'UserService',  label: 'UserService',  type: 'service',  metadata: { description: 'Сервис пользователей. Валидирует JWT через AuthService напрямую.' } },
      { id: 'ТЗ-047',       label: 'ТЗ-047',       type: 'spec',     metadata: { description: 'Требования к аутентификации и авторизации. Раздел 3.2 — stateless.' } },
      { id: 'JWT_Decision', label: 'JWT_Decision', type: 'decision', metadata: { description: 'Решение: JWT вместо сессий. Принято 2026-03-10. Причина: горизонтальное масштабирование.' } },
      { id: 'OAuth_Flow',   label: 'OAuth_Flow',   type: 'decision', metadata: { description: 'Будущая интеграция OAuth2 провайдеров (запланировано на Q3 2026).' } },
    ];

    const seedEdges: Array<Omit<GraphEdge, never> & { weight?: number }> = [
      { source: 'AuthService',  target: 'ТЗ-047',       relation: 'связан_с' },
      { source: 'AuthService',  target: 'UserService',   relation: 'влияет_на' },
      { source: 'JWT_Decision', target: 'AuthService',   relation: 'часть_архитектуры' },
      { source: 'OAuth_Flow',   target: 'AuthService',   relation: 'расширяет' },
    ];

    const upsert = this.db.prepare(`
      INSERT INTO nodes (id, label, type, metadata)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);

    const insertEdge = this.db.prepare(`
      INSERT INTO edges (source, target, relation, weight)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(source, target, relation) DO NOTHING
    `);

    const seedAll = this.db.transaction(() => {
      for (const node of seedNodes) {
        upsert.run(node.id, node.label, node.type, JSON.stringify(node.metadata ?? {}));
      }
      for (const edge of seedEdges) {
        insertEdge.run(edge.source, edge.target, edge.relation);
      }
    });

    seedAll();
    this.logger.log('Knowledge Graph seed data applied.');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Upsert a node. If it exists, updates label/type/metadata.
   */
  upsertNode(node: GraphNode): void {
    const stmt = this.db.prepare(`
      INSERT INTO nodes (id, label, type, metadata)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label    = excluded.label,
        type     = excluded.type,
        metadata = excluded.metadata
    `);
    stmt.run(node.id, node.label, node.type, JSON.stringify(node.metadata ?? {}));
  }

  /**
   * Add an edge between two nodes. Ignores duplicate (source, target, relation).
   */
  addEdge(source: string, target: string, relation: string): void {
    // Ensure both nodes exist (create stubs if not)
    for (const id of [source, target]) {
      if (!this.getNode(id)) {
        this.upsertNode({ id, label: id, type: 'service' });
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO edges (source, target, relation, weight)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(source, target, relation) DO NOTHING
    `);
    stmt.run(source, target, relation);
  }

  /**
   * Increment edge weight — used for gap detection (repeated questions).
   * Returns new weight.
   */
  incrementEdgeWeight(source: string, target: string, relation: string): number {
    // Ensure edge exists first
    this.addEdge(source, target, relation);

    const stmt = this.db.prepare(`
      UPDATE edges SET weight = weight + 1
      WHERE source = ? AND target = ? AND relation = ?
      RETURNING weight
    `);
    const result = stmt.get(source, target, relation) as { weight: number } | undefined;
    return result?.weight ?? 1;
  }

  /**
   * Get all directly connected nodes (neighbors) for a given node id.
   * Returns both outgoing and incoming edges.
   */
  getNeighbors(nodeId: string): { node: GraphNode; relation: string; weight: number; direction: 'out' | 'in' }[] {
    const stmt = this.db.prepare(`
      SELECT
        n.id, n.label, n.type, n.metadata,
        e.relation, e.weight,
        'out' as direction
      FROM edges e
      JOIN nodes n ON n.id = e.target
      WHERE e.source = ?

      UNION ALL

      SELECT
        n.id, n.label, n.type, n.metadata,
        e.relation, e.weight,
        'in' as direction
      FROM edges e
      JOIN nodes n ON n.id = e.source
      WHERE e.target = ?
    `);

    const rows = stmt.all(nodeId, nodeId) as any[];
    return rows.map((row) => ({
      node: {
        id: row.id,
        label: row.label,
        type: row.type as GraphNode['type'],
        metadata: JSON.parse(row.metadata ?? '{}'),
      },
      relation: row.relation,
      weight: row.weight,
      direction: row.direction as 'out' | 'in',
    }));
  }

  /**
   * Get all nodes mentioned in a query by checking if any node id/label
   * appears in the query text (case-insensitive).
   */
  findRelevantNodes(query: string): GraphNode[] {
    const allNodes = this.getAllNodes();
    const queryLower = query.toLowerCase();
    return allNodes.filter(
      (n) =>
        queryLower.includes(n.id.toLowerCase()) ||
        queryLower.includes(n.label.toLowerCase()),
    );
  }

  /**
   * Get a single node by id.
   */
  getNode(id: string): GraphNode | null {
    const stmt = this.db.prepare('SELECT * FROM nodes WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      label: row.label,
      type: row.type,
      metadata: JSON.parse(row.metadata ?? '{}'),
    };
  }

  /**
   * Get all nodes — for graph snapshot endpoint.
   */
  getAllNodes(): GraphNode[] {
    const rows = this.db.prepare('SELECT * FROM nodes').all() as any[];
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      type: row.type as GraphNode['type'],
      metadata: JSON.parse(row.metadata ?? '{}'),
    }));
  }

  /**
   * Get all edges — for graph snapshot endpoint.
   */
  getAllEdges(): GraphEdge[] {
    const rows = this.db.prepare('SELECT source, target, relation FROM edges').all() as any[];
    return rows.map((row) => ({
      source: row.source,
      target: row.target,
      relation: row.relation,
    }));
  }

  /**
   * Get subgraph context for a set of node ids.
   * Returns nodes + edges where both endpoints are in the set.
   */
  getSubgraph(nodeIds: string[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
    if (nodeIds.length === 0) return { nodes: [], edges: [] };

    // Expand to neighbors (1 hop)
    const expandedIds = new Set(nodeIds);
    for (const id of nodeIds) {
      for (const nb of this.getNeighbors(id)) {
        expandedIds.add(nb.node.id);
      }
    }

    const nodes: GraphNode[] = [];
    for (const id of expandedIds) {
      const node = this.getNode(id);
      if (node) nodes.push(node);
    }

    const idArray = [...expandedIds];
    const placeholders = idArray.map(() => '?').join(', ');
    const edgeRows = this.db
      .prepare(
        `SELECT source, target, relation FROM edges
         WHERE source IN (${placeholders}) AND target IN (${placeholders})`,
      )
      .all(...idArray, ...idArray) as any[];

    const edges: GraphEdge[] = edgeRows.map((row) => ({
      source: row.source,
      target: row.target,
      relation: row.relation,
    }));

    return { nodes, edges };
  }

  /**
   * Track question count for a node — for gap detection.
   * Creates a gap node if threshold is reached.
   * Returns new weight.
   */
  trackQuestion(sessionId: string, nodeId: string): number {
    const gapEdgeRelation = 'спросил';
    const weight = this.incrementEdgeWeight(`session_${sessionId}`, nodeId, gapEdgeRelation);

    // If weight reaches 3+, mark node as gap
    if (weight >= 3) {
      const existing = this.getNode(nodeId);
      if (existing && existing.type !== 'gap') {
        // Create a gap node pointing to the original
        const gapId = `gap_${nodeId}`;
        this.upsertNode({
          id: gapId,
          label: `Gap: ${existing.label}`,
          type: 'gap',
          metadata: {
            originalNode: nodeId,
            questionCount: String(weight),
            detectedAt: new Date().toISOString(),
          },
        });
        this.addEdge(nodeId, gapId, 'имеет_пробел');
      }
    }

    return weight;
  }
}
