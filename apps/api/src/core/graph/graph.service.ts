import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Database } from 'bun:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import type { GraphNode, GraphEdge } from '@kibo/shared';

@Injectable()
export class GraphService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GraphService.name);
  private db: Database;

  constructor() {
    const dbPath = path.resolve(
      process.cwd(),
      process.env.GRAPH_DB_PATH ?? './graph.db',
    );

    // Ensure parent directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath, { create: true });
    // WAL mode for better concurrent read performance
    this.db.run('PRAGMA journal_mode = WAL');
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
    this.db.run(`
      CREATE TABLE IF NOT EXISTS nodes (
        id         TEXT PRIMARY KEY,
        label      TEXT NOT NULL,
        type       TEXT NOT NULL,
        metadata   TEXT DEFAULT '{}',
        weight     INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Migrate existing tables: add new columns if they don't exist
    try { this.db.run(`ALTER TABLE nodes ADD COLUMN weight INTEGER DEFAULT 1`); } catch {}
    try { this.db.run(`ALTER TABLE nodes ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`); } catch {}
    try { this.db.run(`ALTER TABLE nodes ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`); } catch {}

    this.db.run(`
      CREATE TABLE IF NOT EXISTS edges (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        source    TEXT NOT NULL,
        target    TEXT NOT NULL,
        relation  TEXT NOT NULL,
        weight    INTEGER NOT NULL DEFAULT 1,
        UNIQUE(source, target, relation)
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)`);

    this.logger.log('Knowledge Graph schema ready.');
  }

  // ---------------------------------------------------------------------------
  // Seed Data
  // ---------------------------------------------------------------------------

  public resetGraph() {
    this.db.run('DELETE FROM edges');
    this.db.run('DELETE FROM nodes');
    this.seedData();
    this.logger.log('Knowledge Graph reset and re-seeded.');
  }

  private seedData() {
    const seedNodes: GraphNode[] = [
      // Команда
      { id: 'Jasur_Senior',   label: 'Jasur (Senior)',       type: 'person', metadata: { description: 'Старший разработчик авторизации.' } },
      { id: 'Kamola_TechLead', label: 'Камола (Tech Lead)',   type: 'person', metadata: { description: 'Техлид команды.' } },
      { id: 'Alibek_Junior',   label: 'Алибек (Junior)',       type: 'person', metadata: { description: 'Младший разработчик.' } },

      // Сервисы
      { id: 'AuthService',         label: 'AuthService',         type: 'service',  metadata: { description: 'Микросервис аутентификации. Выдаёт и валидирует JWT.' } },
      { id: 'UserService',         label: 'UserService',         type: 'service',  metadata: { description: 'Сервис пользователей. Валидирует JWT через AuthService.' } },
      { id: 'PaymentService',      label: 'PaymentService',      type: 'service',  metadata: { description: 'Сервис платежей. Обрабатывает транзакции.' } },
      { id: 'NotificationService', label: 'NotificationService', type: 'service',  metadata: { description: 'Сервис уведомлений. Отправляет почту/push.' } },
      { id: 'ApiGateway',          label: 'ApiGateway',          type: 'service',  metadata: { description: 'Единая точка входа API Gateway.' } },

      // Документы  
      { id: 'ТЗ-047_OAuth',     label: 'ТЗ-047: OAuth flow',          type: 'spec', metadata: { description: 'Спецификация интеграции OAuth2.' } },
      { id: 'ТЗ-089_RateLimit', label: 'ТЗ-089: Rate limiting login', type: 'spec', metadata: { description: 'Спецификация лимитов запросов авторизации.' } },
      { id: 'ТЗ-091_RefreshBug',label: 'ТЗ-091: Refresh logout bug',  type: 'spec', metadata: { description: 'Спецификация исправления бага инвалидации токенов.' } },
      { id: 'ADR-001_JWT',      label: 'ADR-001: JWT Architecture',   type: 'spec', metadata: { description: 'Архитектурное решение о выборе stateless JWT.' } },
    ];

    const seedEdges = [
      { source: 'AuthService',    target: 'Jasur_Senior',     relation: 'владеет' },
      { source: 'AuthService',    target: 'ТЗ-047_OAuth',     relation: 'связан_с' },
      { source: 'AuthService',    target: 'UserService',      relation: 'влияет_на' },
      { source: 'AuthService',    target: 'ApiGateway',       relation: 'влияет_на' },
      { source: 'PaymentService', target: 'UserService',      relation: 'зависит_от' },
      { source: 'Alibek_Junior',  target: 'AuthService',      relation: 'работает_над' },
      { source: 'Alibek_Junior',  target: 'ТЗ-089_RateLimit', relation: 'назначен' },
    ];

    const upsertNode = this.db.prepare(`
      INSERT INTO nodes (id, label, type, metadata)
      VALUES ($id, $label, $type, $metadata)
      ON CONFLICT(id) DO NOTHING
    `);

    const insertEdge = this.db.prepare(`
      INSERT INTO edges (source, target, relation, weight)
      VALUES ($source, $target, $relation, 1)
      ON CONFLICT(source, target, relation) DO NOTHING
    `);

    const seedAll = this.db.transaction(() => {
      for (const node of seedNodes) {
        upsertNode.run({
          $id: node.id,
          $label: node.label,
          $type: node.type,
          $metadata: JSON.stringify(node.metadata ?? {}),
        });
      }
      for (const edge of seedEdges) {
        insertEdge.run({ $source: edge.source, $target: edge.target, $relation: edge.relation });
      }
    });

    seedAll();
    this.logger.log('Knowledge Graph extended seed data applied.');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  upsertNode(node: GraphNode): void {
    this.db.prepare(`
      INSERT INTO nodes (id, label, type, metadata)
      VALUES ($id, $label, $type, $metadata)
      ON CONFLICT(id) DO UPDATE SET
        label    = excluded.label,
        type     = excluded.type,
        metadata = excluded.metadata
    `).run({
      $id: node.id,
      $label: node.label,
      $type: node.type,
      $metadata: JSON.stringify(node.metadata ?? {}),
    });
  }

  addEdge(source: string, target: string, relation: string): void {
    for (const id of [source, target]) {
      if (!this.getNode(id)) {
        this.upsertNode({ id, label: id, type: 'service' });
      }
    }
    this.db.prepare(`
      INSERT INTO edges (source, target, relation, weight)
      VALUES ($source, $target, $relation, 1)
      ON CONFLICT(source, target, relation) DO NOTHING
    `).run({ $source: source, $target: target, $relation: relation });
  }

  incrementEdgeWeight(source: string, target: string, relation: string): number {
    this.addEdge(source, target, relation);
    this.db.prepare(`
      UPDATE edges SET weight = weight + 1
      WHERE source = $source AND target = $target AND relation = $relation
    `).run({ $source: source, $target: target, $relation: relation });

    const row = this.db.prepare(`
      SELECT weight FROM edges
      WHERE source = $source AND target = $target AND relation = $relation
    `).get({ $source: source, $target: target, $relation: relation }) as { weight: number } | undefined;

    return row?.weight ?? 1;
  }

  getNeighbors(nodeId: string): { node: GraphNode; relation: string; weight: number; direction: 'out' | 'in' }[] {
    const outRows = this.db.prepare(`
      SELECT n.id, n.label, n.type, n.metadata, e.relation, e.weight
      FROM edges e JOIN nodes n ON n.id = e.target
      WHERE e.source = $nodeId
    `).all({ $nodeId: nodeId }) as any[];

    const inRows = this.db.prepare(`
      SELECT n.id, n.label, n.type, n.metadata, e.relation, e.weight
      FROM edges e JOIN nodes n ON n.id = e.source
      WHERE e.target = $nodeId
    `).all({ $nodeId: nodeId }) as any[];

    const toResult = (rows: any[], direction: 'out' | 'in') =>
      rows.map((row) => ({
        node: {
          id: row.id,
          label: row.label,
          type: row.type as GraphNode['type'],
          metadata: JSON.parse(row.metadata ?? '{}'),
        },
        relation: row.relation,
        weight: row.weight,
        direction,
      }));

    return [...toResult(outRows, 'out'), ...toResult(inRows, 'in')];
  }

  findRelevantNodes(query: string): GraphNode[] {
    const allNodes = this.getAllNodes();
    const q = query.toLowerCase();
    return allNodes.filter(
      (n) => q.includes(n.id.toLowerCase()) || q.includes(n.label.toLowerCase()),
    );
  }

  getNode(id: string): GraphNode | null {
    const row = this.db.prepare('SELECT * FROM nodes WHERE id = $id').get({ $id: id }) as any;
    if (!row) return null;
    return { id: row.id, label: row.label, type: row.type, metadata: JSON.parse(row.metadata ?? '{}') };
  }

  getAllNodes(): GraphNode[] {
    const rows = this.db.prepare('SELECT * FROM nodes').all() as any[];
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      type: row.type as GraphNode['type'],
      metadata: JSON.parse(row.metadata ?? '{}'),
    }));
  }

  getAllEdges(): GraphEdge[] {
    const rows = this.db.prepare('SELECT source, target, relation, weight FROM edges').all() as any[];
    return rows.map((row) => ({ source: row.source, target: row.target, relation: row.relation, weight: row.weight ?? 1 }));
  }

  getSubgraph(nodeIds: string[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
    if (nodeIds.length === 0) return { nodes: [], edges: [] };

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
    const placeholders = idArray.map((_, i) => `$id${i}`).join(', ');
    const params: Record<string, string> = {};
    idArray.forEach((id, i) => { params[`$id${i}`] = id; });

    const edgeRows = this.db.prepare(`
      SELECT source, target, relation, weight FROM edges
      WHERE source IN (${placeholders}) AND target IN (${placeholders})
    `).all(params) as any[];

    const edges: GraphEdge[] = edgeRows.map((row) => ({
      source: row.source, target: row.target, relation: row.relation, weight: row.weight ?? 1,
    }));

    return { nodes, edges };
  }

  trackQuestion(sessionId: string, nodeId: string): number {
    const weight = this.incrementEdgeWeight(`session_${sessionId}`, nodeId, 'спросил');

    if (weight >= 3) {
      const existing = this.getNode(nodeId);
      if (existing && existing.type !== 'gap') {
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

  findNodes(filter: { type?: string; label?: string }): GraphNode[] {
    let sql = 'SELECT * FROM nodes WHERE 1=1';
    const params: Record<string, string> = {};
    if (filter.type) { sql += ' AND type = $type'; params['$type'] = filter.type; }
    if (filter.label) { sql += ' AND label LIKE $label'; params['$label'] = `%${filter.label}%`; }
    const rows = this.db.prepare(sql).all(params) as any[];
    return rows.map((row) => ({
      id: row.id, label: row.label, type: row.type,
      metadata: JSON.parse(row.metadata ?? '{}'),
      weight: row.weight,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  incrementWeight(nodeId: string, delta = 1): void {
    this.db.prepare(`
      UPDATE nodes SET weight = weight + $delta, updated_at = datetime('now')
      WHERE id = $id
    `).run({ $id: nodeId, $delta: delta });
  }

  getEdgeWeight(source: string, target: string, relation: string): number {
    const row = this.db.prepare(`
      SELECT weight FROM edges WHERE source = $source AND target = $target AND relation = $relation
    `).get({ $source: source, $target: target, $relation: relation }) as { weight: number } | undefined;
    return row?.weight ?? 0;
  }
}
