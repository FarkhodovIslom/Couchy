# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Install dependencies (run from repo root)
npm install

# Start both frontend and backend (Turborepo parallel dev)
npm run dev

# Frontend only (Next.js on :8000)
cd apps/web && bun dev

# Backend only (NestJS on Bun, hot reload, on :3001)
cd apps/api && bun --hot src/main.ts
```

### Type checking
```bash
cd apps/api && bun run tsc --noEmit   # API
cd apps/web && bun run tsc --noEmit   # Web
```

### Docker
```bash
docker compose up   # Serves full stack at :80 via nginx
```

### Environment
`apps/api/.env` (required):
```
GEMINI_API_KEY=your_key_here
```
Optional: `PORT=3001`, `GRAPH_DB_PATH=./graph.db`

## Architecture

### Monorepo Layout
- **`apps/api/`** — NestJS backend on Bun runtime (port 3001)
- **`apps/web/`** — Next.js 14 App Router frontend (port 8000)
- **`packages/shared/`** — TypeScript types shared by both apps, imported as `@kibo/shared`
- **`memory/`** — Markdown files for long-term memory (global + per-session + daily logs)
- **`nginx/`** — Reverse proxy config with SSE buffering disabled

### API (NestJS + Bun)
All routes prefixed `/api`. Organized into `src/core/` (infrastructure) and `src/modules/` (features).

**Core services (`src/core/`)**
- **`LlmService`** — Wraps Gemini 2.5 Flash (`@google/generative-ai`). Methods: `complete(prompt, systemPrompt?, {thinkingLevel?})`, `streamCompletion()` (AsyncGenerator), `embed(text)` → `number[]`. `thinkingLevel` maps to temperature: `low=0.3`, `medium=0.7`, `high=1.0`.
- **`MemoryService`** — Three-layer file memory: `memory/MEMORY.md` (global, read on every request), `memory/sessions/{id}.md` (per-session Q&A), `memory/daily/YYYY-MM-DD.md` (events). Auto-flushes via LLM summarization when session exceeds 80% of 8000-token limit. Uses `ModuleRef` for lazy `LlmService` resolution (avoids circular DI).
- **`GraphService`** — SQLite knowledge graph via `bun:sqlite`. Node types: `service | spec | gap | decision | person | ticket`. Edges are weighted and directed. Seeds apply with `ON CONFLICT DO NOTHING` — DB persists across restarts. Key methods: `upsertNode()`, `getNode()`, `getAllNodes()`, `getAllEdges()`, `getNeighbors()`, `findNodes(filter)`, `findRelevantNodes(query)`, `incrementWeight()`, `trackQuestion()` (creates `gap` nodes at 3-question threshold).
- **`EmbedService`** — Batched embedding via `LlmService.embed()`.
- **`RagIndexService`** — In-memory vector store with brute-force cosine similarity. Methods: `indexFile()`, `searchCode(query, topK)`. No native sqlite-vec dependency.
- **`ClassifyService`** — LLM-based classification. Methods: `topicOf()`, `severityOf()`, `relationOf()`, `stepCoveredBy()`.
- **`AgentService`** — Central orchestrator. `streamAnswer()` is an `AsyncGenerator<AgentStreamEvent>` (types: `token | thinking | sources | alerts | step_complete | done | error`). Also exposes: `generateDoc()`, `reviewCode()`, `analyzeBug()`, `writeSA()`, `buildLearningPath()`.

**Feature modules (`src/modules/`)**

| Module | Controller routes |
|--------|-------------------|
| `onboarding` | `POST /onboarding/start`, `GET /:sid/path`, `PATCH /:sid/step/:stepId`, `GET /:sid/progress` |
| `chat` | `POST /chat/:sid/message` (SSE), `GET /chat/:sid/history` |
| `alerts` | `GET /alerts/:sid`, `PATCH /alerts/:alertId/read`, `GET /alerts/report/:sid` |
| `graph` | `GET /graph/snapshot`, `GET /graph/node/:nodeId` |
| `docs` | `POST /docs/generate`, `GET /docs/:featureId`, `GET /docs`, `DELETE /docs/:featureId` |
| `review` | `POST /review/check`, `GET /review/:reportId` |
| `bugs` | `POST /bugs/analyze`, `POST /bugs/record`, `GET /bugs/history` |
| `sa` | `POST /sa/draft`, `POST /sa/refine`, `PATCH /sa/:docId/approve`, `GET /sa/templates` |
| `simulation` | `POST /simulation/start`, `GET /simulation/stream` (SSE) |
| `health` | `GET /health` |

**Prompt templates** live in `apps/api/prompts/*.txt`. Loaded and cached by `src/shared/prompts/prompt-loader.ts` with `{{var}}` substitution.

### Chat SSE Protocol
`POST /api/chat/:sessionId/message` streams `text/event-stream`. JSON events with `type`:
- `token` — partial LLM text chunk
- `thinking` — agent is reasoning (show typing indicator, no content yet)
- `sources` — `GraphNode[]` referenced in context
- `alerts` — `ProactiveAlert[]` generated during the turn
- `step_complete` — `stepId` string for auto-marking learning steps done
- `done` — stream finished
- `error` — failure message

Frontend uses `fetch` + `ReadableStream` (not `EventSource` — POST not supported by EventSource).

### Frontend (Next.js App Router)
Pages: `/` (root, shows onboarding → chat inline), `/onboarding`, `/chat/[sessionId]`, `/report/[sessionId]`.

**Hooks (`src/hooks/`)**
- `useChat` — streaming state + `send(text)` / `stop()`, exposes `isThinking`
- `useAlerts` — polling + `addAlerts()` + `markRead()`
- `useOnboarding` — step toggle + `markStepComplete(stepId)`
- `useReport` — fetches aggregated lead report

**Key components**
- `ChatWorkspace` — three-panel layout: `LearningPath` | chat center | `MetaPanel`. Uses all four hooks. Mobile drawers for sidebars.
- `MetaPanel` — alerts (severity-sorted, unread badge), activity feed, knowledge graph nodes
- `AlertCard` — severity-color-coded, mark-read button
- `MessageBubble` — renders markdown; shows `TypingIndicator` when `isThinking && !content`
- `LeadReport` — alert aggregation dashboard for lead/SA roles at `/report/[sessionId]`

`apps/web/src/lib/api.ts` is the single API client — all backend calls go through it.

### Shared Types (`@kibo/shared`)
`packages/shared/types/`:
- `graph.ts` — `GraphNode`, `GraphEdge`, `GraphSnapshot`
- `alert.ts` — `ProactiveAlert` (types: `gap_detected | dependency_warning | context_update | breaking_change | ticket_assigned`)
- `session.ts` — `Session`, `UserRole` (`junior_backend | junior_frontend | qa | lead | sa`)
- `onboarding.ts` — `LearningStep`, `OnboardingStartResponse`
- `message.ts` — `ChatMessage`
- `docs.ts` — `GenerateDocRequest`, `GeneratedDoc`
- `review.ts` — `CodeReviewRequest`, `CodeReviewIssue`, `CodeReviewReport`
- `bugs.ts` — `BugAnalyzeRequest`, `BugRisk`, `BugRiskReport`, `BugRecordRequest`
- `sa.ts` — `SADraftRequest`, `SARefinedRequest`, `SADocument`

### Key Design Invariants
- `memory/MEMORY.md` is read on every agent request — keep it concise.
- Gap detection threshold: 3 questions per node per session (`GraphService.trackQuestion()`).
- Dependency alerts are keyword-matched in `AlertsService.checkDependencyAlerts()` (not LLM-based).
- Graph DB persists across restarts (`ON CONFLICT DO NOTHING` seeds). Reset via `POST /api/simulation/start`.
- `MemoryService` uses `ModuleRef` for lazy `LlmService` resolution — do not inject `LlmService` directly into `MemoryModule` or you'll get a circular dependency error.
- `RagIndexService` uses in-memory cosine similarity — no sqlite-vec native extension required.
