# Kibo AI — Production Technical Specification

> AI Onboarding Tutor · Doc Generator · Code Review · Bug Prognosis · SA Writer
> Build with AI Hackathon 2026 · New Uzbekistan University

**Version:** 1.0.0  
**Status:** Production Ready  

---

## 1. Обзор продукта

Kibo AI — корпоративная AI-платформа для передачи знаний внутри dev-команды. Система решает пять связанных проблем одновременно:

| Проблема | Решение Kibo | ROI |
|---|---|---|
| Онбординг занимает 2 недели | AI-тьютор с контекстом проекта | → 3 дня |
| Документация пишется вручную 1ч | DocGeneratorService по коду | → авто |
| Баги доходят до QA | CodeReviewService vs СА-спек | → отлов до QA |
| СА-спек пишется 4 часа | SAWriterService из natural language | → 30 мин |
| Знания уходят с сотрудником | Knowledge Graph + Markdown Memory | → остаются навсегда |


---

## 2. Monorepo структура

```
kibo/                              ← root
├── apps/
│   ├── api/                       ← NestJS + Bun (port 3001)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── chat/
│   │   │   │   ├── alerts/
│   │   │   │   ├── docs/
│   │   │   │   ├── review/
│   │   │   │   ├── bugs/
│   │   │   │   ├── sa/
│   │   │   │   └── graph/         ← P2
│   │   │   ├── core/
│   │   │   │   ├── agent/
│   │   │   │   ├── llm/
│   │   │   │   ├── graph/
│   │   │   │   ├── memory/
│   │   │   │   ├── rag/
│   │   │   │   ├── classify/
│   │   │   │   └── embed/
│   │   │   ├── shared/
│   │   │   │   ├── prompts/       ← prompt templates (versioned)
│   │   │   │   └── validation/
│   │   │   └── app.module.ts
│   │   ├── prompts/               ← .txt файлы промптов
│   │   │   ├── onboarding.txt
│   │   │   ├── chat.txt
│   │   │   ├── doc-gen.txt
│   │   │   ├── review.txt
│   │   │   ├── bug-analyze.txt
│   │   │   └── sa-draft.txt
│   │   ├── memory/
│   │   │   ├── MEMORY.md
│   │   │   ├── daily/
│   │   │   └── sessions/
│   │   ├── docs/                  ← AI-generated documentation
│   │   ├── bugs/                  ← bug history patterns
│   │   ├── templates/             ← SA/BT/BA templates
│   │   ├── .env
│   │   └── package.json
│   └── web/                       ← Next.js 14 + App Router (port 8000)
│       ├── src/
│       │   ├── app/
│       │   │   ├── onboarding/page.tsx
│       │   │   ├── chat/[sessionId]/page.tsx
│       │   │   ├── report/[sessionId]/page.tsx
│       │   │   └── graph/page.tsx  ← P2
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/api.ts
│       └── package.json
├── packages/
│   └── shared/                    ← TypeScript types (единственный источник правды)
│       ├── types/
│       │   ├── index.ts
│       │   ├── session.ts
│       │   ├── message.ts
│       │   ├── onboarding.ts
│       │   ├── alert.ts
│       │   ├── graph.ts
│       │   ├── docs.ts
│       │   ├── review.ts
│       │   ├── bugs.ts
│       │   └── sa.ts
│       └── package.json
├── turbo.json
├── package.json                   ← packageManager: bun@1.3.13
├── docker-compose.yml
└── nginx/nginx.conf
```

---

## 3. Технологический стек

### Backend
| Слой | Технология | Версия |
|---|---|---|
| Runtime | Bun | 1.3.13 |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.x |
| LLM (MVP) | Gemini 3.5 Flash | gemini-3.5-flash |

| Graph DB | SQLite (bun:sqlite) | built-in |
| Vector DB | sqlite-vec | 0.x |
| Memory | Plain Markdown | OpenClaw-style |
| Validation | class-validator + class-transformer | latest |

### Frontend
| Слой | Технология | Версия |
|---|---|---|
| Framework | Next.js App Router | 14.x |
| Language | TypeScript + React 19 | — |
| Styling | Tailwind CSS | 3.x |
| Fonts | JetBrains Mono + DM Sans | Google Fonts |
| HTTP | fetch + ReadableStream (SSE) | native |

### Infrastructure
| Слой | Технология |
|---|---|
| Monorepo | Turborepo |
| Package manager | Bun workspaces |
| Reverse proxy | Nginx (host, not Docker) |
| SSL | Certbot + Let's Encrypt |
| Containerization | Docker Compose |
| CI/CD | GitHub Actions (P2) |

---

## 4. Shared Types (`packages/shared/types/`)

```typescript
// session.ts
export type UserRole = 'junior_backend' | 'junior_frontend' | 'qa' | 'lead' | 'sa'

export interface Session {
  sessionId: string
  userId:    string
  name:      string
  role:      UserRole
  createdAt: string
  updatedAt: string
}

// onboarding.ts
export interface LearningStep {
  id:           string
  title:        string
  description:  string
  relatedNodes: string[]
  completed:    boolean
  completedAt?: string
}

export interface OnboardingStartRequest {
  name: string
  role: UserRole
}

export interface OnboardingStartResponse {
  sessionId:    string
  learningPath: LearningStep[]
  welcomeMessage: string       // первое сообщение от агента
}

// message.ts
export interface ChatMessage {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  sources?:  GraphNode[]
  thinking?:  boolean           // true пока идёт thinkingLevel:high
  createdAt: string
}

// alert.ts
export type AlertType =
  | 'dependency_warning'
  | 'gap_detected'
  | 'context_update'
  | 'breaking_change'
  | 'ticket_assigned'

export interface ProactiveAlert {
  id:           string
  sessionId:    string
  type:         AlertType
  title:        string
  body:         string
  relatedNodes: string[]
  severity:     'info' | 'warning' | 'critical'
  read:         boolean
  createdAt:    string
}

// graph.ts
export type NodeType = 'service' | 'spec' | 'gap' | 'decision' | 'person' | 'ticket'

export interface GraphNode {
  id:        string
  label:     string
  type:      NodeType
  metadata?: Record<string, string>
  weight?:   number
  createdAt: string
  updatedAt: string
}

export interface GraphEdge {
  id:       string
  source:   string
  target:   string
  relation: string
  weight:   number
}

export interface GraphSnapshot {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// docs.ts
export interface GenerateDocRequest {
  code:      string
  tzId?:     string
  featureId: string
  language:  string            // TypeScript, Python, Go…
}

export interface GeneratedDoc {
  id:          string
  featureId:   string
  content:     string          // Markdown
  filePath:    string          // docs/{featureId}.md
  generatedAt: string
}

// review.ts
export interface CodeReviewRequest {
  code:    string
  saDocId: string              // ссылка на СА-спек в docs/
}

export interface CodeReviewIssue {
  line?:       number
  requirement: string          // что нарушено (из СА)
  severity:    'low' | 'medium' | 'high' | 'critical'
  suggestion:  string
}

export interface CodeReviewReport {
  id:          string
  passed:      boolean
  score:       number          // 0-100
  issues:      CodeReviewIssue[]
  summary:     string
  reviewedAt:  string
}

// bugs.ts
export interface BugAnalyzeRequest {
  code:    string
  context: string              // описание фичи
}

export interface BugRisk {
  pattern:     string          // паттерн из истории
  probability: 'low' | 'medium' | 'high'
  description: string
  pastBugId?:  string
}

export interface BugRiskReport {
  id:        string
  risks:     BugRisk[]
  score:     number            // 0-100, 100 = опасно
  summary:   string
  analyzedAt: string
}

export interface BugRecordRequest {
  bugId:       string
  code:        string          // код с багом
  fix:         string          // фикс
  description: string
  service:     string
}

// sa.ts
export interface SADraftRequest {
  description: string          // natural language от аналитика
  templateId?: string          // какой шаблон использовать
  context?:    string          // дополнительный контекст
}

export interface SARefinedRequest {
  draftId:     string
  edits:       string          // что изменить в натуральном языке
}

export interface SADocument {
  id:          string
  title:       string
  content:     string          // структурированный Markdown
  templateId:  string
  status:      'draft' | 'review' | 'approved'
  filePath:    string          // docs/sa-{id}.md
  createdAt:   string
  updatedAt:   string
}
```

---

## 5. API Endpoints (полная спецификация)

Base URL: `http://localhost:3001/api`  
Content-Type: `application/json` (кроме SSE)

### 5.1 Onboarding

```
POST   /onboarding/start
Body:  OnboardingStartRequest
Res:   OnboardingStartResponse
Errors: 400 (invalid role), 422 (validation)

GET    /onboarding/:sessionId/path
Res:   { steps: LearningStep[] }
Errors: 404 (session not found)

PATCH  /onboarding/:sessionId/step/:stepId
Body:  { completed: boolean }
Res:   { ok: true, step: LearningStep }
Errors: 404

GET    /onboarding/:sessionId/progress
Res:   { completed: number, total: number, percent: number }
```

### 5.2 Chat (SSE)

```
POST   /chat/:sessionId/message
Body:  { content: string }
Res:   text/event-stream

SSE events:
  data: { type: 'thinking' }                          ← агент думает (thinkingLevel:high)
  data: { type: 'token',   content: string }          ← токен от LLM
  data: { type: 'sources', nodes: GraphNode[] }       ← источники ответа
  data: { type: 'alerts',  alerts: ProactiveAlert[] } ← проактивные алерты
  data: { type: 'step_complete', stepId: string }     ← шаг learning path закрыт
  data: { type: 'done' }                              ← стрим завершён
  data: { type: 'error',   message: string }          ← ошибка

GET    /chat/:sessionId/history
Res:   { messages: ChatMessage[] }
Errors: 404
```

### 5.3 Alerts

```
GET    /alerts/:sessionId
Query: ?unread=true (фильтр)
Res:   { alerts: ProactiveAlert[] }

PATCH  /alerts/:alertId/read
Res:   { ok: true }

GET    /alerts/report/:sessionId
Res:   { gaps: GraphNode[], topQuestions: string[], progress: LearningStep[] }
       ← страница /report для Лида
```

### 5.4 Doc Generator

```
POST   /docs/generate
Body:  GenerateDocRequest
Res:   GeneratedDoc
Note:  Синхронный. LLM генерирует, сохраняет в docs/{featureId}.md
Errors: 400, 422, 503 (LLM unavailable)

GET    /docs/:featureId
Res:   GeneratedDoc
Errors: 404

GET    /docs
Query: ?service=AuthService (фильтр)
Res:   { docs: GeneratedDoc[] }

DELETE /docs/:featureId
Res:   { ok: true }
```

### 5.5 Code Review

```
POST   /review/check
Body:  CodeReviewRequest
Res:   CodeReviewReport
Note:  thinkingLevel:high — точность важнее скорости
Errors: 400 (saDocId not found), 503

GET    /review/:reportId
Res:   CodeReviewReport
Errors: 404
```

### 5.6 Bug Analysis

```
POST   /bugs/analyze
Body:  BugAnalyzeRequest
Res:   BugRiskReport

POST   /bugs/record
Body:  BugRecordRequest
Res:   { ok: true, bugId: string }
Note:  Пишет в bugs/{bugId}.md + обновляет граф

GET    /bugs/history
Query: ?service=AuthService&severity=high
Res:   { bugs: BugRecordRequest[] }
```

### 5.7 SA Writer

```
POST   /sa/draft
Body:  SADraftRequest
Res:   SADocument

POST   /sa/refine
Body:  SARefinedRequest
Res:   SADocument (updated)

PATCH  /sa/:docId/approve
Res:   { ok: true, filePath: string }
Note:  Сохраняет финальную версию в docs/sa-{id}.md

GET    /sa/templates
Res:   { templates: { id: string, name: string }[] }
```

### 5.8 Knowledge Graph (P2)

```
GET    /graph/snapshot
Res:   GraphSnapshot

GET    /graph/node/:nodeId
Res:   { node: GraphNode, neighbors: GraphSnapshot }

POST   /webhooks/git
Body:  { event: 'push', files: string[], author: string, message: string }
Res:   { ok: true, alertsCreated: number }
Note:  P2 — real-time Git integration
```

### 5.9 Error формат

```typescript
interface ApiError {
  error:      string
  code:       string          // VALIDATION_ERROR | NOT_FOUND | LLM_ERROR | etc.
  statusCode: number
  details?:   Record<string, string[]>
}
```

---

## 6. Сервисы — детальная спецификация

### 6.1 AgentService (core orchestrator)

Центральный сервис. Все domain-сервисы идут через него.

```typescript
@Injectable()
export class AgentService {
  constructor(
    private llm:      LlmService,
    private graph:    GraphService,
    private memory:   MemoryService,
    private rag:      RagIndexService,
    private classify: ClassifyService,
  ) {}

  // Строит персонализированный learning path
  async buildLearningPath(role: UserRole): Promise<LearningStep[]>

  // Core: стримит ответ на вопрос
  async *streamAnswer(
    sessionId: string,
    userMessage: string,
    options?: { thinkingLevel?: 'low' | 'medium' | 'high' }
  ): AsyncGenerator<SSEEvent>

  // Проверяет нужны ли proactive alerts
  async checkProactiveAlerts(sessionId: string, message: string): Promise<ProactiveAlert[]>

  // Решает закрыт ли шаг learning path
  async checkStepCompletion(sessionId: string, stepId: string, message: string): Promise<boolean>

  // Записывает gap в граф
  async recordGap(sessionId: string, topic: string): Promise<void>

  // Feature 2: генерирует документацию
  async generateDoc(req: GenerateDocRequest): Promise<string>   // Markdown

  // Feature 3: ревьюит код против СА
  async reviewCode(code: string, saContent: string): Promise<CodeReviewReport>

  // Feature 4: анализирует риски бага
  async analyzeBug(code: string, context: string, bugHistory: string): Promise<BugRiskReport>

  // Feature 5: пишет СА-спек
  async writeSA(description: string, template: string, context: string): Promise<string>

  // Внутренний: строит системный промпт
  private buildSystemPrompt(
    sessionId: string,
    longTermMemory: string,
    graphContext: string,
    ragContext: string,
    role: UserRole,
    name: string
  ): string
}
```

**Логика buildSystemPrompt:**
```typescript
private buildSystemPrompt(...): string {
  return `
Ты — Kibo, AI-ассистент команды разработки. Ты знаешь всю архитектуру,
ТЗ, БТ, СА и историю решений команды. Отвечай как опытный коллега.

ПОЛЬЗОВАТЕЛЬ: ${name} · ${role}

АРХИТЕКТУРНЫЕ РЕШЕНИЯ КОМАНДЫ:
${longTermMemory}

СВЯЗАННЫЙ КОНТЕКСТ ИЗ ГРАФА ЗНАНИЙ:
${graphContext}

РЕЛЕВАНТНЫЙ КОД И ДОКУМЕНТАЦИЯ (RAG):
${ragContext}

ПРАВИЛА:
- Ссылайся на конкретные ТЗ/БТ/СА когда отвечаешь
- Предупреждай о зависимостях между сервисами
- Если не знаешь точно — скажи прямо
- Ответ на русском, код на нужном языке
- Будь конкретным, без воды
`
}
```

---

### 6.2 LlmService

```typescript
@Injectable()
export class LlmService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

  private getModel(thinkingLevel: ThinkingLevel = 'low') {
    return this.genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        thinkingConfig: { thinkingLevel }
        // low:    чат, быстрые ответы
        // medium: документация, gap detection
        // high:   code review, bug analysis (точность важнее скорости)
      }
    })
  }

  // Стриминг токенов
  async *streamCompletion(
    systemPrompt: string,
    messages:     { role: 'user' | 'model'; parts: [{ text: string }] }[],
    options?:     { thinkingLevel?: ThinkingLevel }
  ): AsyncGenerator<string>

  // Разовый вызов: классификация, step completion, severity
  async complete(
    prompt:   string,
    options?: { thinkingLevel?: ThinkingLevel }
  ): Promise<string>

  // Embedding для RAG
  async embed(text: string): Promise<number[]>
}
---

### 6.3 GraphService

```typescript
// SQLite schema

CREATE TABLE nodes (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  type       TEXT NOT NULL,           -- service|spec|gap|decision|person|ticket
  metadata   TEXT DEFAULT '{}',       -- JSON string
  weight     INTEGER DEFAULT 0,       -- для gap detection
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE edges (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  source_id  TEXT NOT NULL REFERENCES nodes(id),
  target_id  TEXT NOT NULL REFERENCES nodes(id),
  relation   TEXT NOT NULL,
  weight     INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
CREATE INDEX idx_nodes_type   ON nodes(type);

PRAGMA journal_mode = WAL;           -- concurrent reads
PRAGMA synchronous  = NORMAL;

// Service API
@Injectable()
export class GraphService {
  upsertNode(node: Partial<GraphNode>): GraphNode
  addEdge(source: string, target: string, relation: string, weight?: number): void
  getNeighbors(nodeId: string, maxHops?: number): GraphSnapshot   // default: 1 hop
  findNodes(query: { type?: NodeType; label?: string }): GraphNode[]
  incrementWeight(nodeId: string, delta?: number): void           // для gap detection
  getEdgeWeight(source: string, target: string): number
  getSnapshot(): GraphSnapshot
  seedDatabase(): void                                            // вызывается при старте
}

// Seed данные (вызывается если граф пустой)
const SEED_NODES: Partial<GraphNode>[] = [
  // Команда
  { id: 'jasur_senior',   label: 'Jasur (Senior Dev)',   type: 'person' },
  { id: 'kamola_lead',    label: 'Камола (Tech Lead)',    type: 'person' },
  { id: 'alibek_junior',  label: 'Алибек (Junior)',       type: 'person' },

  // Сервисы
  { id: 'AuthService',    label: 'AuthService',           type: 'service' },
  { id: 'UserService',    label: 'UserService',           type: 'service' },
  { id: 'PaymentService', label: 'PaymentService',        type: 'service' },
  { id: 'ApiGateway',     label: 'ApiGateway',            type: 'service' },
  { id: 'NotifService',   label: 'NotificationService',   type: 'service' },

  // Документы
  { id: 'tz_047',         label: 'ТЗ-047: OAuth Flow',   type: 'spec' },
  { id: 'tz_089',         label: 'ТЗ-089: Rate Limiting', type: 'spec' },
  { id: 'adr_001',        label: 'ADR-001: JWT Decision', type: 'decision' },
]

const SEED_EDGES = [
  ['jasur_senior',   'AuthService',    'владеет'],
  ['AuthService',    'tz_047',         'описан_в'],
  ['AuthService',    'UserService',    'влияет_на'],
  ['AuthService',    'ApiGateway',     'влияет_на'],
  ['adr_001',        'AuthService',    'архитектурное_решение'],
  ['PaymentService', 'UserService',    'зависит_от'],
  ['alibek_junior',  'AuthService',    'работает_над'],
  ['alibek_junior',  'tz_089',         'назначен'],
]
```

---

### 6.4 MemoryService

```typescript
// Структура файлов
memory/
  MEMORY.md              ← долгосрочная память (архитектура, решения, договорённости)
  daily/
    2026-05-23.md        ← дневные логи (gap события, важные обсуждения)
    2026-05-24.md
  sessions/
    {sessionId}.md       ← Q&A история конкретного пользователя

@Injectable()
export class MemoryService {
  private readonly MEMORY_DIR = process.env.MEMORY_DIR

  // Долгосрочная память — читается в каждый промпт
  async readLongTerm(): Promise<string>

  // Сессионный контекст — Q&A история пользователя
  async readSession(sessionId: string): Promise<string>

  // Дописать Q&A в сессию
  async appendSession(sessionId: string, entry: {
    question: string
    answer:   string
    sources:  string[]
    at:       string
  }): Promise<void>

  // Дописать событие в дневной лог
  async appendDaily(entry: string): Promise<void>

  // AUTO-FLUSH: вызывается когда сессия > 80% от TOKEN_LIMIT
  // Сжимает важное → MEMORY.md, очищает сессию
  async flush(sessionId: string): Promise<void>

  // Внутренний: подсчёт токенов (приблизительно)
  private estimateTokens(text: string): number
}

// TOKEN_LIMIT = 8000 (оставляем запас для графа + промпта)
// При flush: агент summarize сессию → важное уходит в MEMORY.md
```

---

### 6.5 RagIndexService

```typescript
// Vector schema (sqlite-vec)
CREATE VIRTUAL TABLE vectors USING vec0(
  doc_id    TEXT,
  embedding float[1024]
);

CREATE TABLE vector_docs (
  id         TEXT PRIMARY KEY,
  doc_id     TEXT NOT NULL,           -- уникальный ID документа
  content    TEXT NOT NULL,           -- чанк текста
  source     TEXT NOT NULL,           -- путь к файлу
  chunk_idx  INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

@Injectable()
export class RagIndexService {
  constructor(
    private db:    GraphService,        // shared SQLite connection
    private embed: EmbeddingService,
  ) {}

  // Индексировать файл (чанки по 512 токенов, overlap 50)
  async indexFile(filePath: string): Promise<void>

  // Индексировать всю кодовую базу
  async indexCodebase(dir: string): Promise<{ indexed: number }>

  // Поиск топ-K релевантных чанков
  async searchCode(query: string, topK: number = 5): Promise<{
    content: string
    source:  string
    score:   number
  }[]>

  // Удалить документ из индекса (при обновлении файла)
  async removeDoc(docId: string): Promise<void>
}
```

---

### 6.6 ClassifyService

```typescript
@Injectable()
export class ClassifyService {
  constructor(private llm: LlmService) {}

  // Тема вопроса — одно слово/имя сервиса
  async topicOf(question: string): Promise<string>

  // Серьёзность бага
  async severityOf(bugDescription: string): Promise<'low' | 'medium' | 'high' | 'critical'>

  // Тип dependency (влияет_на / зависит_от / использует / описан_в)
  async relationOf(source: string, target: string): Promise<string>

  // Закрыт ли шаг learning path
  async stepCoveredBy(question: string, stepTitle: string): Promise<boolean>
}
```

---

### 6.7 DocGeneratorService

```typescript
@Injectable()
export class DocGeneratorService {
  constructor(
    private agent:  AgentService,
    private memory: MemoryService,
    private rag:    RagIndexService,
  ) {}

  async generate(req: GenerateDocRequest): Promise<GeneratedDoc> {
    // 1. Тянем контекст: ТЗ из RAG + память команды
    const tzContext  = req.tzId ? await this.rag.searchCode(req.tzId, 3) : []
    const longTermMem = await this.memory.readLongTerm()

    // 2. Генерируем документацию (thinkingLevel: medium)
    const content = await this.agent.generateDoc({
      ...req, tzContext, longTermMem
    })

    // 3. Сохраняем в docs/{featureId}.md
    const filePath = `docs/${req.featureId}.md`
    await fs.writeFile(filePath, content, 'utf-8')

    // 4. Индексируем для будущего RAG
    await this.rag.indexFile(filePath)

    return { id: uuid(), featureId: req.featureId, content, filePath, generatedAt: new Date().toISOString() }
  }
}

// Промпт (prompts/doc-gen.txt):
// Ты технический писатель команды. Напиши документацию на основе:
// - Кода: {code}
// - ТЗ: {tzContext}
// - Архитектурных решений: {longTermMem}
// Структура: Overview | API | Parameters | Examples | Dependencies | Edge Cases
```

---

### 6.8 CodeReviewService

```typescript
@Injectable()
export class CodeReviewService {
  constructor(private agent: AgentService) {}

  async review(req: CodeReviewRequest): Promise<CodeReviewReport> {
    // Читаем СА-спек из docs/
    const saContent = await fs.readFile(`docs/${req.saDocId}.md`, 'utf-8')

    // thinkingLevel: high — точность критична
    const report = await this.agent.reviewCode(req.code, saContent)

    return {
      id:         uuid(),
      ...report,
      reviewedAt: new Date().toISOString()
    }
  }
}

// Промпт (prompts/review.txt):
// Ты senior code reviewer. Сравни код с требованиями из СА-спека.
// Верни JSON: { passed, score, issues: [{line, requirement, severity, suggestion}], summary }
// Каждый пропущенный requirement — отдельный issue.
// Severity: low (стиль) | medium (логика) | high (безопасность) | critical (не реализовано)
```

---

### 6.9 BugLearnService

```typescript
@Injectable()
export class BugLearnService {
  constructor(
    private agent: AgentService,
    private graph: GraphService,
  ) {}

  async analyze(req: BugAnalyzeRequest): Promise<BugRiskReport> {
    // 1. Читаем историю багов из bugs/
    const bugHistory = await this.readBugHistory(req)

    // 2. Анализируем (thinkingLevel: high)
    const report = await this.agent.analyzeBug(req.code, req.context, bugHistory)

    return { id: uuid(), ...report, analyzedAt: new Date().toISOString() }
  }

  async recordFix(req: BugRecordRequest): Promise<string> {
    // 1. Сохраняем паттерн в bugs/{bugId}.md
    const bugId   = req.bugId || uuid()
    const content = this.formatBugDoc(req)
    await fs.writeFile(`bugs/${bugId}.md`, content, 'utf-8')

    // 2. Обновляем граф: нода сервиса получает атрибут known_bug
    this.graph.upsertNode({
      id:       req.service,
      metadata: { [`bug_${bugId}`]: req.description }
    })

    return bugId
  }

  // self-learning: чем больше записанных фиксов, тем точнее следующий analyze
  private async readBugHistory(req: BugAnalyzeRequest): Promise<string>
  private formatBugDoc(req: BugRecordRequest): string
}
```

---

### 6.10 SAWriterService

```typescript
@Injectable()
export class SAWriterService {
  constructor(
    private agent:  AgentService,
    private memory: MemoryService,
  ) {}

  async draft(req: SADraftRequest): Promise<SADocument> {
    // Читаем шаблон
    const templateId = req.templateId || 'standard'
    const template   = await fs.readFile(`templates/${templateId}.md`, 'utf-8')
    const longTermMem = await this.memory.readLongTerm()

    const content = await this.agent.writeSA(req.description, template, longTermMem)
    const docId   = uuid()

    return {
      id:         docId,
      title:      this.extractTitle(content),
      content,
      templateId,
      status:     'draft',
      filePath:   `docs/sa-${docId}.md`,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    }
  }

  async refine(req: SARefinedRequest): Promise<SADocument>
  async approve(docId: string): Promise<SADocument>

  private extractTitle(content: string): string
}

// Промпт (prompts/sa-draft.txt):
// Ты системный аналитик. Создай стандартизированный СА-спек.
// Описание от аналитика: {description}
// Шаблон структуры: {template}
// Контекст команды: {longTermMem}
// Обязательные секции: Цель | Пользователи | User Stories | API | Data Model | Edge Cases | Acceptance Criteria
```

---

### 6.11 AlertsService + Gap Detection

```typescript
@Injectable()
export class AlertsService {
  constructor(
    private agent:    AgentService,
    private graph:    GraphService,
    private classify: ClassifyService,
    private memory:   MemoryService,
  ) {}

  // Вызывается при каждом вопросе пользователя
  async processQuestion(sessionId: string, question: string): Promise<ProactiveAlert[]> {
    const alerts: ProactiveAlert[] = []

    // 1. Классифицируем тему
    const topic = await this.classify.topicOf(question)

    // 2. Gap detection
    this.graph.incrementWeight(topic)
    const weight = this.graph.getEdgeWeight('session_' + sessionId, topic)

    if (weight >= 2) {
      this.graph.upsertNode({ id: topic, type: 'gap' })
      await this.memory.appendDaily(
        `[GAP] ${new Date().toISOString()} · ${topic} спросили ${weight} раз`
      )
    }

    if (weight >= 3) {
      alerts.push(this.createAlert(sessionId, {
        type:     'gap_detected',
        title:    `Пробел в знаниях: ${topic}`,
        body:     `Вопрос задавался ${weight} раз. Лиду рекомендуется добавить документацию.`,
        severity: weight >= 5 ? 'critical' : 'warning',
        relatedNodes: [topic],
      }))
    }

    // 3. Dependency warning
    const depAlerts = await this.checkDependencies(sessionId, question)
    alerts.push(...depAlerts)

    return alerts
  }

  // Проверяет затрагивает ли вопрос критические зависимости
  private async checkDependencies(sessionId: string, message: string): Promise<ProactiveAlert[]>

  // Возвращает все alerts для сессии
  async getAlerts(sessionId: string, unreadOnly?: boolean): Promise<ProactiveAlert[]>

  // Репорт для Лида
  async getReport(sessionId: string): Promise<{
    gaps:          GraphNode[]
    topQuestions:  string[]
    progress:      LearningStep[]
    recommendations: string[]
  }>

  private createAlert(sessionId: string, data: Partial<ProactiveAlert>): ProactiveAlert
  private saveAlert(alert: ProactiveAlert): void
}
```

---

## 7. Prompt Templates (versioned)

Все промпты — отдельные файлы в `prompts/`. Версионируются в Git.  
Никаких промптов хардкодом в TypeScript.

```
prompts/
  onboarding.txt     ← buildLearningPath
  chat.txt           ← streamAnswer (main)
  doc-gen.txt        ← generateDoc
  review.txt         ← reviewCode
  bug-analyze.txt    ← analyzeBug
  sa-draft.txt       ← writeSA
  classify.txt       ← topicOf / stepCoveredBy
```

**Правило:** каждый промпт начинается с `# VERSION: x.x` и `# LAST_UPDATED: date`.

---

## 8. Frontend — архитектура

### Роуты

```
/onboarding                ← OnboardingScreen (публичный)
/chat/[sessionId]          ← ChatWorkspace (основной UI)
/report/[sessionId]        ← LeadReport (для Лида)
/graph                     ← GraphVisualization (P2, D3)
```

### Hooks

```typescript
// useChat.ts — SSE через fetch + ReadableStream (не EventSource — POST не поддерживает)
export function useChat(sessionId: string): {
  messages:    ChatMessage[]
  sendMessage: (content: string) => Promise<void>
  streaming:   boolean
  thinking:    boolean              // true пока thinkingLevel:high думает
}

// useAlerts.ts — polling каждые 5 секунд
export function useAlerts(sessionId: string): ProactiveAlert[]

// useOnboarding.ts
export function useOnboarding(sessionId: string): {
  steps:      LearningStep[]
  progress:   { completed: number; total: number; percent: number }
  completeStep: (stepId: string) => void
}

// useReport.ts — для страницы Лида
export function useReport(sessionId: string): {
  gaps:            GraphNode[]
  topQuestions:    string[]
  recommendations: string[]
}
```

### Компоненты

```
components/
  OnboardingScreen.tsx     ← форма + role cards (spring анимации)
  ChatWorkspace.tsx        ← layout: sidebar | chat | meta
  LearningPath.tsx         ← dot индикаторы + stagger анимация
  ChatPane.tsx             ← сообщения + streaming cursor
  MessageBubble.tsx        ← user/agent + sources + thinking indicator
  ChatInput.tsx            ← → / ■ кнопка + Cmd+Enter
  MetaPanel.tsx            ← alerts + gap nodes
  GraphNodeCard.tsx        ← badge-pop анимация
  LeadReport.tsx           ← gap таблица + рекомендации
  TypingIndicator.tsx      ← · · · три точки
```

---

## 9. Docker Compose (Production)

```yaml
# docker-compose.yml
version: '3.9'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - '3001:3001'
    volumes:
      - ./apps/api/memory:/app/memory     # персистентность памяти
      - ./apps/api/docs:/app/docs
      - ./apps/api/bugs:/app/bugs
      - ./apps/api/templates:/app/templates
      - ./data/graph.db:/app/graph.db     # SQLite граф
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - MEMORY_DIR=/app/memory
      - GRAPH_DB_PATH=/app/graph.db
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/api/health']
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - '8000:8000'
    environment:
      - NEXT_PUBLIC_API_URL=https://your-domain.com/api
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped

# Nginx — на хосте, не в Docker
# Nginx проксирует :80/:443 → :8000 (web) и :3001 (api)
# SSE требует: proxy_buffering off; proxy_cache off;
```

---

## 10. Nginx конфиг

```nginx
# nginx/nginx.conf

upstream web { server 127.0.0.1:8000; }
upstream api { server 127.0.0.1:3001; }

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Next.js
    location / {
        proxy_pass         http://web;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }

    # NestJS API
    location /api/ {
        proxy_pass         http://api/api/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }

    # SSE — критично: отключить буферизацию
    location /api/chat/ {
        proxy_pass             http://api/api/chat/;
        proxy_buffering        off;
        proxy_cache            off;
        proxy_set_header       Connection '';
        proxy_http_version     1.1;
        chunked_transfer_encoding on;
        proxy_read_timeout     300s;
    }
}
```

---

## 11. Environment Variables

```bash
# apps/api/.env
NODE_ENV=development

# LLM
GEMINI_API_KEY=AIza...

# Storage
MEMORY_DIR=./memory
GRAPH_DB_PATH=./graph.db

# Server
PORT=3001
CORS_ORIGIN=http://localhost:8000

# Limits
TOKEN_LIMIT=8000                # flush threshold для MemoryService
CHUNK_SIZE=512                  # RAG chunk size (tokens)
CHUNK_OVERLAP=50
RAG_TOP_K=5

# Gap detection
GAP_THRESHOLD=3                 # сколько раз вопрос → gap node
```

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 12. Безопасность

| Угроза | Митигация |
|---|---|
| Prompt injection | sanitize входных данных, system prompt не перезаписывается |
| Sensitive data в MEMORY.md | никакие credentials не логируются |
| API без авторизации | JWT-auth на production (P2) |
| SQLite concurrent write | WAL mode, single writer через NestJS singleton |
| XSS через AI-контент | React автоматически escapes, markdown через sanitized renderer |

---

## 13. P2 Roadmap

| Фича | Приоритет | Описание |
|---|---|---|
| Redis CacheModule | P2 | Одинаковый вопрос → кэшированный ответ, -40% LLM cost |
| AuditLogModule | P2 | Каждый AI-запрос логируется, compliance требование |
| Git Webhook | P2 | Real-time мониторинг коммитов, auto re-index |
| D3 Graph Visualization | P2 | /graph страница, force-directed, gap nodes пульсируют |
| JWT Authentication | P2 | Авторизация по ролям |
| GitHub Actions CI/CD | P2 | auto deploy при push в main |

---

## 14. Чеклист к сабмиту

```
Infrastructure
  [ ] Docker Compose поднимается: docker compose up
  [ ] Nginx конфиг настроен (SSE unbuffered)
  [ ] Все volumes персистентны (memory/, docs/, graph.db)

Backend
  [ ] /api/health endpoint возвращает 200
  [ ] Все P0 эндпоинты работают (onboarding, chat, alerts)
  [ ] SSE стримит токены корректно
  [ ] Graph seed данные загружены
  [ ] MEMORY.md с контентом команды
  [ ] GAP_THRESHOLD=3 работает корректно

Frontend
  [ ] /onboarding — форма, role cards, spring анимации
  [ ] /chat/[sessionId] — sidebar, chat, meta panel
  [ ] /report/[sessionId] — gap таблица для Лида
  [ ] SSE через fetch (не EventSource)
  [ ] Polling alerts каждые 5с
  [ ] Typing indicator перед первым токеном
  [ ] iOS spring анимации на кнопках и картах

Demo
  [ ] Сценарий с Алибеком проходит полностью (4 минуты)
  [ ] Gap badge появляется при 2+ повторах
  [ ] Proactive alert при "UserService" в вопросе
  [ ] /report показывает пробелы Лиду
  [ ] Google Slides по официальному шаблону (обязательно)
  [ ] Репозиторий публичный + README.md

README.md обязан содержать:
  [ ] Описание проекта
  [ ] Инструкция запуска (docker compose up / bun dev)
  [ ] Env variables с примерами
  [ ] Demo credentials / test data
  [ ] Disclosure: Gemini 3.5 Flash, sqlite-vec, NestJS, Next.js
```

