import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Database } from 'bun:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import type { GraphNode, GraphEdge } from '@kibo/shared';

const STOP_WORDS = new Set([
  'кто', 'что', 'как', 'где', 'для', 'при', 'под', 'над', 'без', 'все', 'всё', 'всех', 'был', 'была', 'было', 
  'были', 'его', 'нее', 'неё', 'еще', 'ещё', 'нет', 'или', 'там', 'тут', 'вот', 'так', 'про', 'над', 'под',
  'это', 'этот', 'эта', 'этому', 'этой', 'этом', 'этих', 'эти', 'тот', 'та', 'то', 'том', 'тех', 'те', 'тем',
  'наш', 'ваш', 'свой', 'мой', 'твой', 'ему', 'ней', 'ней', 'ними', 'ими', 'один', 'два', 'три', 'чем', 'тем',
  'или', 'бы', 'же', 'ли', 'но', 'да', 'же', 'хотя', 'если', 'раз', 'мне', 'тебе', 'себе', 'очень', 'быстро',
  'тоже', 'также', 'только', 'уже', 'всего', 'почти', 'хочет', 'может', 'могут', 'надо', 'нужно', 'хочу',
  'будет', 'будут', 'быть', 'было', 'есть', 'были', 'сделать', 'найти', 'какой', 'какая', 'какое', 'какие',
  'каких', 'какому', 'каком', 'какой-то', 'какая-то', 'какие-то', 'такой', 'такая', 'такое', 'такие'
]);

const TRANSLITERATIONS: Record<string, string> = {
  'жасур': 'jasur',
  'камола': 'kamola',
  'рустам': 'rustam',
  'алибек': 'alibek',
  'дилноза': 'dilnoza',
  'мадина': 'madina',
  'тимур': 'timur',
  'сардор': 'sardor'
};


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
      // ── Команда ─────────────────────────────────────────────────────────────
      { id: 'Jasur_Senior',    label: 'Jasur (Senior BE)',      type: 'person',   metadata: { role: 'Senior Backend', description: 'Владелец AuthService и ApiGateway. Ведёт code-review по безопасности.' }, weight: 5 },
      { id: 'Kamola_TechLead', label: 'Камола (Tech Lead)',     type: 'person',   metadata: { role: 'Tech Lead',      description: 'Техлид. Принимает архитектурные решения, владелец UserService и OrderService.' }, weight: 6 },
      { id: 'Alibek_Junior',   label: 'Алибек (Junior BE)',     type: 'person',   metadata: { role: 'Junior Backend', description: 'Новый разработчик. Сейчас онбординг. Задача: ТЗ-089 Rate Limiting.' }, weight: 3 },
      { id: 'Dilnoza_QA',      label: 'Дилноза (QA)',           type: 'person',   metadata: { role: 'QA Engineer',    description: 'QA-инженер. Ведёт E2E-тесты авторизации и платежей.' }, weight: 4 },
      { id: 'Rustam_SA',       label: 'Рустам (SA)',            type: 'person',   metadata: { role: 'Solution Architect', description: 'Архитектор системы. Автор всех ADR. Ведёт ТЗ-102.' }, weight: 5 },
      { id: 'Madina_FE',       label: 'Мадина (Senior FE)',     type: 'person',   metadata: { role: 'Senior Frontend', description: 'Ведёт фронтенд. Владелец WebApp и AdminPanel. React, Next.js.' }, weight: 4 },
      { id: 'Timur_DevOps',    label: 'Тимур (DevOps)',         type: 'person',   metadata: { role: 'DevOps Engineer', description: 'CI/CD, Kubernetes, мониторинг. Владелец всей инфраструктуры.' }, weight: 4 },
      { id: 'Sardor_Mobile',   label: 'Сардор (Mobile)',        type: 'person',   metadata: { role: 'Mobile Developer', description: 'React Native разработчик. Мобильное приложение.' }, weight: 3 },

      // ── Backend сервисы ──────────────────────────────────────────────────────
      { id: 'ApiGateway',          label: 'ApiGateway',          type: 'service', metadata: { description: 'Единая точка входа. Маршрутизация, rate-limit на уровне сети, SSL-терминация. Порт 443.', owner: 'Jasur_Senior', stack: 'Nginx + Lua' }, weight: 7 },
      { id: 'AuthService',         label: 'AuthService',         type: 'service', metadata: { description: 'Аутентификация и авторизация. Выдаёт Access JWT (15 мин) и Refresh token (7 дней). Реализует OAuth2 + PKCE.', owner: 'Jasur_Senior', stack: 'NestJS, PostgreSQL, Redis', port: '3001' }, weight: 8 },
      { id: 'UserService',         label: 'UserService',         type: 'service', metadata: { description: 'Профили пользователей, роли, настройки. Все мутации требуют валидного Access JWT. Хранит PII-данные.', owner: 'Kamola_TechLead', stack: 'NestJS, PostgreSQL', port: '3002' }, weight: 6 },
      { id: 'OrderService',        label: 'OrderService',        type: 'service', metadata: { description: 'Управление заказами. Принимает заказы, меняет статусы, генерирует события через EventBus.', owner: 'Kamola_TechLead', stack: 'NestJS, PostgreSQL, RabbitMQ', port: '3003' }, weight: 6 },
      { id: 'PaymentService',      label: 'PaymentService',      type: 'service', metadata: { description: 'Обработка платежей. Интеграция со Stripe и Payme. Асинхронное подтверждение через webhook.', owner: 'Jasur_Senior', stack: 'NestJS, PostgreSQL, Stripe SDK', port: '3004' }, weight: 5 },
      { id: 'NotificationService', label: 'NotificationService', type: 'service', metadata: { description: 'Отправка email, SMS, push-уведомлений. Работает через очередь RabbitMQ. Шаблонизатор: Handlebars.', owner: 'Dilnoza_QA', stack: 'NestJS, RabbitMQ, SendGrid', port: '3005' }, weight: 4 },
      { id: 'AnalyticsService',    label: 'AnalyticsService',    type: 'service', metadata: { description: 'Агрегация метрик и событий. ClickHouse как хранилище. Читает события из EventBus.', owner: 'Rustam_SA', stack: 'NestJS, ClickHouse, RabbitMQ', port: '3006' }, weight: 4 },
      { id: 'EventBus',            label: 'EventBus (RabbitMQ)', type: 'service', metadata: { description: 'Шина событий на RabbitMQ. Все async-взаимодействия между сервисами идут через неё. Exchanges: orders.*, payments.*.', owner: 'Rustam_SA', stack: 'RabbitMQ 3.12' }, weight: 7 },
      { id: 'SearchService',       label: 'SearchService',       type: 'service', metadata: { description: 'Полнотекстовый поиск. Elasticsearch. Индексирует товары, заказы, пользователей.', owner: 'Kamola_TechLead', stack: 'NestJS, Elasticsearch 8', port: '3007' }, weight: 3 },
      { id: 'FileService',         label: 'FileService',         type: 'service', metadata: { description: 'Загрузка и хранение файлов. MinIO (S3-compatible). Аватарки, документы, чеки.', owner: 'Jasur_Senior', stack: 'NestJS, MinIO', port: '3008' }, weight: 3 },
      { id: 'CacheLayer',          label: 'CacheLayer (Redis)',   type: 'service', metadata: { description: 'Кэш-слой: сессии, rate-limit counters, hot queries. Redis Cluster в production.', owner: 'Timur_DevOps', stack: 'Redis 7 Cluster' }, weight: 5 },
      { id: 'SchedulerService',    label: 'SchedulerService',     type: 'service', metadata: { description: 'Cron-задачи: очистка expired tokens, отправка дайджестов, reconciliation платежей.', owner: 'Kamola_TechLead', stack: 'NestJS, Bull', port: '3009' }, weight: 3 },

      // ── Frontend ─────────────────────────────────────────────────────────────
      { id: 'WebApp',         label: 'WebApp (Next.js)',       type: 'service', metadata: { description: 'Основной веб-клиент. Next.js 14 App Router, SSR, Tailwind CSS.', owner: 'Madina_FE', stack: 'Next.js 14, React 18' }, weight: 5 },
      { id: 'AdminPanel',     label: 'AdminPanel',             type: 'service', metadata: { description: 'Панель администратора. CRUD пользователей, заказов, настройки системы.', owner: 'Madina_FE', stack: 'React, Vite, Ant Design' }, weight: 3 },
      { id: 'MobileApp',      label: 'MobileApp (RN)',         type: 'service', metadata: { description: 'Мобильное приложение. React Native + Expo. iOS и Android.', owner: 'Sardor_Mobile', stack: 'React Native, Expo' }, weight: 4 },

      // ── Инфраструктура ───────────────────────────────────────────────────────
      { id: 'PostgresDB',     label: 'PostgreSQL',     type: 'service', metadata: { description: 'Основная реляционная БД. PostgreSQL 15. Хранит users, orders, payments. Репликация master-slave.', owner: 'Timur_DevOps', stack: 'PostgreSQL 15' }, weight: 6 },
      { id: 'ClickHouseDB',   label: 'ClickHouse',     type: 'service', metadata: { description: 'Колоночная БД для аналитики. Хранит events, metrics, audit logs. 90-дневный retention.', owner: 'Timur_DevOps', stack: 'ClickHouse 23.8' }, weight: 3 },
      { id: 'ElasticSearch',  label: 'Elasticsearch',  type: 'service', metadata: { description: 'Поисковый движок. Индексы: products, orders, users. Синхронизация через EventBus.', owner: 'Timur_DevOps', stack: 'Elasticsearch 8.11' }, weight: 3 },
      { id: 'MinIO',          label: 'MinIO (S3)',      type: 'service', metadata: { description: 'Объектное хранилище. Бакеты: avatars, invoices, exports. Pre-signed URLs.', owner: 'Timur_DevOps', stack: 'MinIO' }, weight: 2 },
      { id: 'K8s_Cluster',    label: 'Kubernetes',     type: 'service', metadata: { description: 'Production кластер. 3 nodes, auto-scaling, HPA, Ingress Controller.', owner: 'Timur_DevOps', stack: 'K8s 1.28, Helm' }, weight: 5 },
      { id: 'CI_CD',          label: 'CI/CD Pipeline', type: 'service', metadata: { description: 'GitHub Actions: lint → test → build → deploy. Canary deployments в prod.', owner: 'Timur_DevOps', stack: 'GitHub Actions, Docker' }, weight: 4 },
      { id: 'Monitoring',     label: 'Monitoring Stack', type: 'service', metadata: { description: 'Grafana + Prometheus + Loki. Дашборды по каждому сервису. PagerDuty alerts.', owner: 'Timur_DevOps', stack: 'Grafana, Prometheus, Loki' }, weight: 4 },

      // ── Спецификации (ТЗ) ───────────────────────────────────────────────────
      { id: 'ТЗ-047_OAuth',        label: 'ТЗ-047: OAuth2 + PKCE',          type: 'spec', metadata: { description: 'Полная спецификация OAuth2 Authorization Code Flow с PKCE. Включает эндпоинты, форматы токенов, обработку ошибок.', status: 'approved', author: 'Rustam_SA' }, weight: 4 },
      { id: 'ТЗ-089_RateLimit',    label: 'ТЗ-089: Rate Limiting /auth',    type: 'spec', metadata: { description: 'Rate limiting на /auth/login: 5 req/min per IP. При превышении — 429 + Retry-After header. Redis как счётчик.', status: 'in_progress', author: 'Alibek_Junior' }, weight: 3 },
      { id: 'ТЗ-091_RefreshBug',   label: 'ТЗ-091: Refresh Token Logout Bug', type: 'spec', metadata: { description: 'КРИТИЧЕСКИЙ БАГ (Prod): refresh token не инвалидируется при logout. Пользователь может продолжать сессию после выхода.', status: 'critical', author: 'Jasur_Senior' }, weight: 5 },
      { id: 'ТЗ-102_OrderFlow',    label: 'ТЗ-102: Order Lifecycle',        type: 'spec', metadata: { description: 'Жизненный цикл заказа: created → confirmed → paid → fulfilled → closed. События через EventBus.', status: 'approved', author: 'Rustam_SA' }, weight: 4 },
      { id: 'ТЗ-115_PayRetry',     label: 'ТЗ-115: Payment Retry Logic',    type: 'spec', metadata: { description: 'Логика повторных попыток при сбое оплаты: 3 попытки с экспоненциальным backoff (1м, 5м, 30м).', status: 'draft', author: 'Kamola_TechLead' }, weight: 3 },
      { id: 'ТЗ-123_Search',       label: 'ТЗ-123: Full-Text Search',       type: 'spec', metadata: { description: 'Полнотекстовый поиск товаров. Fuzzy matching, фильтры, фасеты, подсказки. Elasticsearch.', status: 'approved', author: 'Kamola_TechLead' }, weight: 3 },
      { id: 'ТЗ-130_Notifications', label: 'ТЗ-130: Push Notifications',    type: 'spec', metadata: { description: 'Push-уведомления для мобильного приложения. FCM для Android, APNs для iOS. Настройки per-user.', status: 'in_progress', author: 'Sardor_Mobile' }, weight: 3 },
      { id: 'ТЗ-135_RBAC',         label: 'ТЗ-135: RBAC System',            type: 'spec', metadata: { description: 'Role-Based Access Control. Роли: admin, manager, user, viewer. Permissions на уровне ресурсов.', status: 'approved', author: 'Rustam_SA' }, weight: 4 },
      { id: 'ТЗ-140_AuditLog',     label: 'ТЗ-140: Audit Log',              type: 'spec', metadata: { description: 'Журнал аудита всех критических операций. Кто, когда, что. ClickHouse для хранения.', status: 'draft', author: 'Rustam_SA' }, weight: 3 },
      { id: 'ТЗ-145_WebSocket',    label: 'ТЗ-145: Real-time WebSocket',    type: 'spec', metadata: { description: 'WebSocket для real-time обновлений: статусы заказов, чат поддержки, живые уведомления.', status: 'approved', author: 'Madina_FE' }, weight: 3 },

      // ── Архитектурные решения (ADR) ─────────────────────────────────────────
      { id: 'ADR-001_JWT',         label: 'ADR-001: JWT vs Sessions',       type: 'decision', metadata: { description: 'Решение: Access JWT (stateless, 15 мин) + Refresh Token (Redis, 7 дней). Горизонтальное масштабирование.', status: 'accepted', date: '2026-03-10' }, weight: 4 },
      { id: 'ADR-002_EventBus',    label: 'ADR-002: Event-Driven',          type: 'decision', metadata: { description: 'Все async-коммуникации через RabbitMQ. Sync только для read-запросов внутри домена.', status: 'accepted', date: '2026-04-02' }, weight: 4 },
      { id: 'ADR-003_Monorepo',    label: 'ADR-003: Monorepo (Turborepo)', type: 'decision', metadata: { description: 'Монорепозиторий с Turborepo + Bun. Shared-типы и atomic PR.', status: 'accepted', date: '2026-04-15' }, weight: 3 },
      { id: 'ADR-004_CQRS',        label: 'ADR-004: CQRS Pattern',         type: 'decision', metadata: { description: 'Command-Query Separation для OrderService: write в PostgreSQL, read из Redis/ES.', status: 'accepted', date: '2026-04-20' }, weight: 3 },
      { id: 'ADR-005_K8s',         label: 'ADR-005: K8s vs ECS',           type: 'decision', metadata: { description: 'Kubernetes вместо AWS ECS. Причина: vendor-agnostic, helm charts, multi-cloud ready.', status: 'accepted', date: '2026-05-01' }, weight: 3 },
      { id: 'ADR-006_BFF',         label: 'ADR-006: BFF Pattern',          type: 'decision', metadata: { description: 'Backend-For-Frontend: ApiGateway адаптирует ответы под web/mobile клиентов.', status: 'proposed', date: '2026-05-15' }, weight: 2 },

      // ── Gaps (Knowledge) ───────────────────────────────────────────────────
      { id: 'GAP_AuthFlow',     label: 'Gap: Auth Flow',          type: 'gap', metadata: { description: 'Алибек задавал вопросы про OAuth flow 4 раза. Документация AuthService неполная.' }, weight: 5 },
      { id: 'GAP_EventFormat',  label: 'Gap: Event Format',       type: 'gap', metadata: { description: 'Формат событий в EventBus не задокументирован. Нет schema registry.' }, weight: 4 },
      { id: 'GAP_Deployment',   label: 'Gap: Deploy Process',     type: 'gap', metadata: { description: 'Процесс деплоя описан только устно. Нет runbook для новых разработчиков.' }, weight: 4 },
      { id: 'GAP_ErrorHandling', label: 'Gap: Error Handling',    type: 'gap', metadata: { description: 'Нет единого стандарта обработки ошибок между сервисами. Каждый возвращает в своём формате.' }, weight: 3 },
      { id: 'GAP_Testing',      label: 'Gap: Test Strategy',      type: 'gap', metadata: { description: 'Нет единой стратегии тестирования. Unit/Integration/E2E — coverage неравномерный.' }, weight: 3 },

      // ── Тикеты ──────────────────────────────────────────────────────────────
      { id: 'TICKET-089',   label: 'TICKET-089: Rate Limiting',    type: 'ticket', metadata: { description: 'Реализовать rate limiting для /auth/login согласно ТЗ-089. Assignee: Алибек. Sprint 12.', status: 'in_progress', assignee: 'Alibek_Junior' }, weight: 3 },
      { id: 'TICKET-091',   label: 'TICKET-091: Fix Refresh Bug',  type: 'ticket', metadata: { description: 'CRITICAL. Исправить logout: удалять refresh token из Redis по jti. Hotfix.', status: 'in_review', assignee: 'Jasur_Senior' }, weight: 5 },
      { id: 'TICKET-115',   label: 'TICKET-115: Payment Retry',    type: 'ticket', metadata: { description: 'Добавить retry-логику в PaymentService согласно ТЗ-115. Sprint 13.', status: 'todo', assignee: 'Kamola_TechLead' }, weight: 3 },
      { id: 'TICKET-123',   label: 'TICKET-123: Search MVP',       type: 'ticket', metadata: { description: 'Реализовать базовый поиск товаров через Elasticsearch. Sprint 13.', status: 'todo', assignee: 'Kamola_TechLead' }, weight: 3 },
      { id: 'TICKET-130',   label: 'TICKET-130: Push Mobile',      type: 'ticket', metadata: { description: 'Интеграция FCM/APNs в мобильное приложение. Sprint 14.', status: 'todo', assignee: 'Sardor_Mobile' }, weight: 2 },
      { id: 'TICKET-135',   label: 'TICKET-135: RBAC Migration',   type: 'ticket', metadata: { description: 'Миграция текущих ролей на новую RBAC систему. Sprint 14.', status: 'todo', assignee: 'Jasur_Senior' }, weight: 3 },
      { id: 'TICKET-140',   label: 'TICKET-140: Audit Log',        type: 'ticket', metadata: { description: 'Реализовать audit log для UserService и AuthService. Sprint 15.', status: 'backlog', assignee: 'Rustam_SA' }, weight: 2 },
      { id: 'TICKET-145',   label: 'TICKET-145: WebSocket',        type: 'ticket', metadata: { description: 'WebSocket сервер для real-time обновлений статусов заказов. Sprint 14.', status: 'in_progress', assignee: 'Madina_FE' }, weight: 3 },
    ];

    const seedEdges = [
      // ── Владение сервисами ──────────────────────────────────────────────────
      { source: 'AuthService',         target: 'Jasur_Senior',     relation: 'владелец' },
      { source: 'UserService',         target: 'Kamola_TechLead',  relation: 'владелец' },
      { source: 'OrderService',        target: 'Kamola_TechLead',  relation: 'владелец' },
      { source: 'PaymentService',      target: 'Jasur_Senior',     relation: 'владелец' },
      { source: 'ApiGateway',          target: 'Jasur_Senior',     relation: 'владелец' },
      { source: 'AnalyticsService',    target: 'Rustam_SA',        relation: 'владелец' },
      { source: 'EventBus',            target: 'Rustam_SA',        relation: 'владелец' },
      { source: 'SearchService',       target: 'Kamola_TechLead',  relation: 'владелец' },
      { source: 'FileService',         target: 'Jasur_Senior',     relation: 'владелец' },
      { source: 'CacheLayer',          target: 'Timur_DevOps',     relation: 'владелец' },
      { source: 'SchedulerService',    target: 'Kamola_TechLead',  relation: 'владелец' },
      { source: 'WebApp',              target: 'Madina_FE',        relation: 'владелец' },
      { source: 'AdminPanel',          target: 'Madina_FE',        relation: 'владелец' },
      { source: 'MobileApp',           target: 'Sardor_Mobile',    relation: 'владелец' },
      { source: 'K8s_Cluster',         target: 'Timur_DevOps',     relation: 'владелец' },
      { source: 'CI_CD',               target: 'Timur_DevOps',     relation: 'владелец' },
      { source: 'Monitoring',          target: 'Timur_DevOps',     relation: 'владелец' },
      { source: 'NotificationService', target: 'Sardor_Mobile',    relation: 'совладелец' },

      // ── Зависимости сервисов (backend) ──────────────────────────────────────
      { source: 'ApiGateway',          target: 'AuthService',         relation: 'проксирует' },
      { source: 'ApiGateway',          target: 'UserService',         relation: 'проксирует' },
      { source: 'ApiGateway',          target: 'OrderService',        relation: 'проксирует' },
      { source: 'ApiGateway',          target: 'SearchService',       relation: 'проксирует' },
      { source: 'ApiGateway',          target: 'FileService',         relation: 'проксирует' },
      { source: 'UserService',         target: 'AuthService',         relation: 'зависит_от' },
      { source: 'OrderService',        target: 'UserService',         relation: 'зависит_от' },
      { source: 'OrderService',        target: 'EventBus',            relation: 'публикует_в' },
      { source: 'PaymentService',      target: 'OrderService',        relation: 'зависит_от' },
      { source: 'PaymentService',      target: 'EventBus',            relation: 'публикует_в' },
      { source: 'NotificationService', target: 'EventBus',            relation: 'подписан_на' },
      { source: 'AnalyticsService',    target: 'EventBus',            relation: 'подписан_на' },
      { source: 'SearchService',       target: 'EventBus',            relation: 'подписан_на' },
      { source: 'SchedulerService',    target: 'EventBus',            relation: 'публикует_в' },

      // ── Зависимости от БД / infra ──────────────────────────────────────────
      { source: 'AuthService',         target: 'PostgresDB',     relation: 'использует' },
      { source: 'AuthService',         target: 'CacheLayer',     relation: 'использует' },
      { source: 'UserService',         target: 'PostgresDB',     relation: 'использует' },
      { source: 'OrderService',        target: 'PostgresDB',     relation: 'использует' },
      { source: 'PaymentService',      target: 'PostgresDB',     relation: 'использует' },
      { source: 'AnalyticsService',    target: 'ClickHouseDB',   relation: 'использует' },
      { source: 'SearchService',       target: 'ElasticSearch',  relation: 'использует' },
      { source: 'FileService',         target: 'MinIO',          relation: 'использует' },
      { source: 'UserService',         target: 'FileService',    relation: 'зависит_от' },
      { source: 'OrderService',        target: 'CacheLayer',     relation: 'кэширует_в' },
      { source: 'NotificationService', target: 'CacheLayer',     relation: 'использует' },

      // ── Frontend → Backend ─────────────────────────────────────────────────
      { source: 'WebApp',     target: 'ApiGateway',   relation: 'запрашивает' },
      { source: 'AdminPanel', target: 'ApiGateway',   relation: 'запрашивает' },
      { source: 'MobileApp',  target: 'ApiGateway',   relation: 'запрашивает' },
      { source: 'MobileApp',  target: 'NotificationService', relation: 'получает_push' },

      // ── Инфраструктура ─────────────────────────────────────────────────────
      { source: 'CI_CD',       target: 'K8s_Cluster', relation: 'деплоит_в' },
      { source: 'Monitoring',  target: 'K8s_Cluster', relation: 'мониторит' },
      { source: 'K8s_Cluster', target: 'PostgresDB',  relation: 'хостит' },
      { source: 'K8s_Cluster', target: 'CacheLayer',  relation: 'хостит' },
      { source: 'K8s_Cluster', target: 'EventBus',    relation: 'хостит' },

      // ── Спецификации → Сервисы ──────────────────────────────────────────────
      { source: 'ТЗ-047_OAuth',      target: 'AuthService',      relation: 'описывает' },
      { source: 'ТЗ-089_RateLimit',  target: 'AuthService',      relation: 'описывает' },
      { source: 'ТЗ-089_RateLimit',  target: 'ApiGateway',       relation: 'затрагивает' },
      { source: 'ТЗ-089_RateLimit',  target: 'CacheLayer',       relation: 'использует' },
      { source: 'ТЗ-091_RefreshBug', target: 'AuthService',      relation: 'описывает_баг' },
      { source: 'ТЗ-091_RefreshBug', target: 'CacheLayer',       relation: 'затрагивает' },
      { source: 'ТЗ-102_OrderFlow',  target: 'OrderService',     relation: 'описывает' },
      { source: 'ТЗ-102_OrderFlow',  target: 'PaymentService',   relation: 'затрагивает' },
      { source: 'ТЗ-102_OrderFlow',  target: 'EventBus',         relation: 'затрагивает' },
      { source: 'ТЗ-115_PayRetry',   target: 'PaymentService',   relation: 'описывает' },
      { source: 'ТЗ-115_PayRetry',   target: 'NotificationService', relation: 'затрагивает' },
      { source: 'ТЗ-123_Search',     target: 'SearchService',    relation: 'описывает' },
      { source: 'ТЗ-123_Search',     target: 'ElasticSearch',    relation: 'затрагивает' },
      { source: 'ТЗ-130_Notifications', target: 'NotificationService', relation: 'описывает' },
      { source: 'ТЗ-130_Notifications', target: 'MobileApp',     relation: 'затрагивает' },
      { source: 'ТЗ-135_RBAC',       target: 'AuthService',      relation: 'описывает' },
      { source: 'ТЗ-135_RBAC',       target: 'UserService',      relation: 'затрагивает' },
      { source: 'ТЗ-135_RBAC',       target: 'AdminPanel',       relation: 'затрагивает' },
      { source: 'ТЗ-140_AuditLog',   target: 'AnalyticsService', relation: 'описывает' },
      { source: 'ТЗ-140_AuditLog',   target: 'ClickHouseDB',     relation: 'затрагивает' },
      { source: 'ТЗ-145_WebSocket',  target: 'WebApp',           relation: 'описывает' },
      { source: 'ТЗ-145_WebSocket',  target: 'OrderService',     relation: 'затрагивает' },

      // ── ADR → Сервисы ──────────────────────────────────────────────────────
      { source: 'ADR-001_JWT',      target: 'AuthService',    relation: 'обосновывает' },
      { source: 'ADR-001_JWT',      target: 'UserService',    relation: 'затрагивает' },
      { source: 'ADR-001_JWT',      target: 'CacheLayer',     relation: 'затрагивает' },
      { source: 'ADR-002_EventBus', target: 'EventBus',       relation: 'обосновывает' },
      { source: 'ADR-002_EventBus', target: 'OrderService',   relation: 'затрагивает' },
      { source: 'ADR-002_EventBus', target: 'PaymentService', relation: 'затрагивает' },
      { source: 'ADR-003_Monorepo', target: 'CI_CD',          relation: 'обосновывает' },
      { source: 'ADR-004_CQRS',    target: 'OrderService',    relation: 'обосновывает' },
      { source: 'ADR-004_CQRS',    target: 'CacheLayer',      relation: 'затрагивает' },
      { source: 'ADR-004_CQRS',    target: 'ElasticSearch',   relation: 'затрагивает' },
      { source: 'ADR-005_K8s',     target: 'K8s_Cluster',     relation: 'обосновывает' },
      { source: 'ADR-005_K8s',     target: 'CI_CD',           relation: 'затрагивает' },
      { source: 'ADR-006_BFF',     target: 'ApiGateway',      relation: 'обосновывает' },
      { source: 'ADR-006_BFF',     target: 'WebApp',          relation: 'затрагивает' },
      { source: 'ADR-006_BFF',     target: 'MobileApp',       relation: 'затрагивает' },

      // ── Тикеты → Люди, Сервисы, Спеки ─────────────────────────────────────
      { source: 'TICKET-089', target: 'Alibek_Junior',  relation: 'назначен' },
      { source: 'TICKET-089', target: 'AuthService',    relation: 'затрагивает' },
      { source: 'TICKET-089', target: 'ТЗ-089_RateLimit', relation: 'реализует' },
      { source: 'TICKET-091', target: 'Jasur_Senior',   relation: 'назначен' },
      { source: 'TICKET-091', target: 'AuthService',    relation: 'затрагивает' },
      { source: 'TICKET-091', target: 'ТЗ-091_RefreshBug', relation: 'реализует' },
      { source: 'TICKET-115', target: 'Kamola_TechLead', relation: 'назначен' },
      { source: 'TICKET-115', target: 'PaymentService', relation: 'затрагивает' },
      { source: 'TICKET-115', target: 'ТЗ-115_PayRetry', relation: 'реализует' },
      { source: 'TICKET-123', target: 'Kamola_TechLead', relation: 'назначен' },
      { source: 'TICKET-123', target: 'SearchService',  relation: 'затрагивает' },
      { source: 'TICKET-123', target: 'ТЗ-123_Search',  relation: 'реализует' },
      { source: 'TICKET-130', target: 'Sardor_Mobile',  relation: 'назначен' },
      { source: 'TICKET-130', target: 'MobileApp',      relation: 'затрагивает' },
      { source: 'TICKET-130', target: 'ТЗ-130_Notifications', relation: 'реализует' },
      { source: 'TICKET-135', target: 'Jasur_Senior',   relation: 'назначен' },
      { source: 'TICKET-135', target: 'AuthService',    relation: 'затрагивает' },
      { source: 'TICKET-135', target: 'ТЗ-135_RBAC',   relation: 'реализует' },
      { source: 'TICKET-140', target: 'Rustam_SA',      relation: 'назначен' },
      { source: 'TICKET-140', target: 'AnalyticsService', relation: 'затрагивает' },
      { source: 'TICKET-140', target: 'ТЗ-140_AuditLog', relation: 'реализует' },
      { source: 'TICKET-145', target: 'Madina_FE',      relation: 'назначен' },
      { source: 'TICKET-145', target: 'WebApp',         relation: 'затрагивает' },
      { source: 'TICKET-145', target: 'ТЗ-145_WebSocket', relation: 'реализует' },

      // ── Gaps → связи ──────────────────────────────────────────────────────
      { source: 'GAP_AuthFlow',     target: 'AuthService',     relation: 'пробел_в' },
      { source: 'GAP_AuthFlow',     target: 'ТЗ-047_OAuth',    relation: 'документация' },
      { source: 'GAP_AuthFlow',     target: 'Alibek_Junior',   relation: 'обнаружен' },
      { source: 'GAP_EventFormat',  target: 'EventBus',        relation: 'пробел_в' },
      { source: 'GAP_EventFormat',  target: 'ADR-002_EventBus', relation: 'документация' },
      { source: 'GAP_Deployment',   target: 'CI_CD',           relation: 'пробел_в' },
      { source: 'GAP_Deployment',   target: 'K8s_Cluster',     relation: 'связан_с' },
      { source: 'GAP_Deployment',   target: 'Alibek_Junior',   relation: 'обнаружен' },
      { source: 'GAP_ErrorHandling', target: 'ApiGateway',     relation: 'пробел_в' },
      { source: 'GAP_ErrorHandling', target: 'OrderService',   relation: 'связан_с' },
      { source: 'GAP_Testing',      target: 'Dilnoza_QA',      relation: 'обнаружен' },
      { source: 'GAP_Testing',      target: 'AuthService',     relation: 'связан_с' },
      { source: 'GAP_Testing',      target: 'PaymentService',  relation: 'связан_с' },

      // ── Люди → текущая работа ──────────────────────────────────────────────
      { source: 'Alibek_Junior',   target: 'AuthService',      relation: 'работает_над' },
      { source: 'Alibek_Junior',   target: 'ТЗ-089_RateLimit', relation: 'изучает' },
      { source: 'Dilnoza_QA',      target: 'AuthService',      relation: 'тестирует' },
      { source: 'Dilnoza_QA',      target: 'OrderService',     relation: 'тестирует' },
      { source: 'Dilnoza_QA',      target: 'PaymentService',   relation: 'тестирует' },
      { source: 'Madina_FE',       target: 'WebApp',           relation: 'работает_над' },
      { source: 'Sardor_Mobile',   target: 'MobileApp',        relation: 'работает_над' },
      { source: 'Timur_DevOps',    target: 'K8s_Cluster',      relation: 'работает_над' },
      { source: 'Timur_DevOps',    target: 'Monitoring',       relation: 'работает_над' },
      { source: 'Rustam_SA',       target: 'ADR-004_CQRS',     relation: 'автор' },
      { source: 'Rustam_SA',       target: 'ADR-005_K8s',      relation: 'автор' },
    ];

    const upsertNode = this.db.prepare(`
      INSERT INTO nodes (id, label, type, metadata, weight)
      VALUES ($id, $label, $type, $metadata, $weight)
      ON CONFLICT(id) DO UPDATE SET weight = $weight
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
          $weight: node.weight ?? 1,
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
    
    const queryWords = q.split(/[^a-zA-Z0-9а-яА-ЯёЁ\-]+/)
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
      
    return allNodes.filter((n) => {
      const id = n.id.toLowerCase();
      const label = n.label.toLowerCase();
      const desc = (n.metadata?.description ?? '').toLowerCase();
      
      // Direct matches
      if (q.includes(id) || id.includes(q)) return true;
      if (q.includes(label) || label.includes(q)) return true;
      
      // Check query words against node ID, label, and description
      for (const word of queryWords) {
        if (id.includes(word) || label.includes(word) || desc.includes(word)) return true;
        
        // Transliteration matching
        const translit = TRANSLITERATIONS[word];
        if (translit) {
          if (id.includes(translit) || label.includes(translit) || desc.includes(translit)) return true;
        }
        
        // Stem matching
        if (word.length >= 4) {
          const stem = word.replace(/[ауеыиомйхвс]$|[ое]м$|ов$|ев$|ия$|ии$|ие$|ах$|ам$|ому$|ему$/, '');
          if (stem.length >= 3 && !STOP_WORDS.has(stem)) {
            if (id.includes(stem) || label.includes(stem) || desc.includes(stem)) return true;
            
            const stemTranslit = TRANSLITERATIONS[stem];
            if (stemTranslit) {
              if (id.includes(stemTranslit) || label.includes(stemTranslit) || desc.includes(stemTranslit)) return true;
            }
          }
        }
      }
      
      return false;
    });
  }


  getNode(id: string): GraphNode | null {
    const row = this.db.prepare('SELECT * FROM nodes WHERE id = $id').get({ $id: id }) as any;
    if (!row) return null;
    return { id: row.id, label: row.label, type: row.type, metadata: JSON.parse(row.metadata ?? '{}'), weight: row.weight ?? 1 };
  }

  getAllNodes(): GraphNode[] {
    const rows = this.db.prepare('SELECT * FROM nodes').all() as any[];
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      type: row.type as GraphNode['type'],
      metadata: JSON.parse(row.metadata ?? '{}'),
      weight: row.weight ?? 1,
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
