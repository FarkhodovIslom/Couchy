# Kibo AI — Manual Testing Guide

**Base URL:** `http://localhost:3001/api`  
**Frontend:** `http://localhost:3000`

Prerequisites: API running (`bun --hot src/main.ts` in `apps/api/`), `GEMINI_API_KEY` set in `.env`.

---

## 0. Smoke Test

```bash
curl http://localhost:3001/api/health
```

**Expected:**
```json
{ "status": "ok", "timestamp": "...", "version": "1.0.0" }
```

---

## 1. Onboarding

### 1.1 Start session — Junior Backend
```bash
curl -s -X POST http://localhost:3001/api/onboarding/start \
  -H "Content-Type: application/json" \
  -d '{"name": "Алибек", "role": "junior_backend"}' | jq .
```

**Expected:** `{ sessionId: "sess_...", learningPath: [...3 steps...] }`  
**Save the `sessionId`** — used in all subsequent calls.

```bash
SESSION=<paste sessionId here>
```

### 1.2 Start session — Lead
```bash
curl -s -X POST http://localhost:3001/api/onboarding/start \
  -H "Content-Type: application/json" \
  -d '{"name": "Жасур", "role": "lead"}' | jq .
```

**Expected:** learningPath contains steps `step_lead_graph`, `step_lead_gaps`, `step_lead_report`.

### 1.3 Start session — Solution Architect
```bash
curl -s -X POST http://localhost:3001/api/onboarding/start \
  -H "Content-Type: application/json" \
  -d '{"name": "Малика", "role": "sa"}' | jq .
```

**Expected:** learningPath contains steps `step_sa_writer`, `step_sa_templates`, `step_sa_review`.

### 1.4 Get learning path
```bash
curl -s http://localhost:3001/api/onboarding/$SESSION/path | jq .
```

**Expected:** `{ steps: [...] }` — same path as returned on start.

### 1.5 Mark a step complete
```bash
curl -s -X PATCH http://localhost:3001/api/onboarding/$SESSION/step/step_tz047 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}' | jq .
```

**Expected:** `{ ok: true }`

### 1.6 Check progress
```bash
curl -s http://localhost:3001/api/onboarding/$SESSION/progress | jq .
```

**Expected:** `{ total: 3, completed: 1, percent: 33 }`

### 1.7 Edge case — invalid session
```bash
curl -s http://localhost:3001/api/onboarding/nonexistent/path | jq .
```

**Expected:** 404 `{ statusCode: 404, message: "Session not found" }`

### 1.8 Edge case — empty name
```bash
curl -s -X POST http://localhost:3001/api/onboarding/start \
  -H "Content-Type: application/json" \
  -d '{"role": "qa"}' | jq .
```

**Expected:** session created with name defaulting to "Аноним".

---

## 2. Chat (SSE)

### 2.1 Basic message
```bash
curl -s -N -X POST http://localhost:3001/api/chat/$SESSION/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Что такое AuthService?"}' 
```

**Expected stream:**
```
data: {"type":"sources","nodes":[...]}
data: {"type":"token","content":"AuthService "}
data: {"type":"token","content":"— это..."}
...
data: {"type":"done"}
```

**Verify:**
- At least one `token` event arrives
- A `sources` event references `AuthService` or related nodes
- Stream ends with `done`

### 2.2 Trigger dependency alert
```bash
curl -s -N -X POST http://localhost:3001/api/chat/$SESSION/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Я рефакторинг UserService — меняю интерфейс"}' 
```

**Expected:** A `data: {"type":"alerts","alerts":[...]}` event appears **before** the first `token`, warning about downstream dependencies.

### 2.3 Trigger gap detection (ask 3 times about same node)
Run this command **3 times in the same session:**
```bash
curl -s -N -X POST http://localhost:3001/api/chat/$SESSION/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Как работает AuthService?"}' | grep -a "alerts\|gap"
```

**Expected on the 3rd call:** `alerts` event with `type: "gap_detected"` for `AuthService`.

### 2.4 Empty message → validation error
```bash
curl -s -X POST http://localhost:3001/api/chat/$SESSION/message \
  -H "Content-Type: application/json" \
  -d '{"content": "   "}' | jq .
```

**Expected:** `{ error: "Message content is required", code: "EMPTY_MESSAGE", statusCode: 400 }`

### 2.5 History endpoint
```bash
curl -s http://localhost:3001/api/chat/$SESSION/history | jq .
```

**Expected:** `{ messages: [] }` (stub — not yet persisted, returns empty array).

---

## 3. Alerts

### 3.1 Get alerts (after gap was triggered in §2.3)
```bash
curl -s "http://localhost:3001/api/alerts/$SESSION" | jq .
```

**Expected:** `{ alerts: [{ type: "gap_detected", ... }] }`

### 3.2 Get only unread alerts
```bash
curl -s "http://localhost:3001/api/alerts/$SESSION?unread=true" | jq .
```

**Expected:** Only alerts where `read` is not `true`.

### 3.3 Mark alert as read
```bash
# Get an alert ID first
ALERT_ID=$(curl -s "http://localhost:3001/api/alerts/$SESSION" | jq -r '.alerts[0].id')

curl -s -X PATCH "http://localhost:3001/api/alerts/$ALERT_ID/read" | jq .
```

**Expected:** `{ ok: true }`

Verify it's marked:
```bash
curl -s "http://localhost:3001/api/alerts/$SESSION" | jq '.alerts[0].read'
```

**Expected:** `true`

### 3.4 Mark non-existent alert → 404
```bash
curl -s -X PATCH "http://localhost:3001/api/alerts/fake_alert_id/read" | jq .
```

**Expected:** `{ statusCode: 404, message: "Alert not found" }`

### 3.5 Lead report
```bash
curl -s "http://localhost:3001/api/alerts/report/$SESSION" | jq .
```

**Expected:**
```json
{
  "totalAlerts": 1,
  "unreadAlerts": 0,
  "gapNodes": [{ "nodeId": "AuthService", "count": 3 }],
  "alertsByType": { "gap_detected": 1 }
}
```

---

## 4. Knowledge Graph

### 4.1 Get full snapshot
```bash
curl -s http://localhost:3001/api/graph/snapshot | jq '{nodes: (.nodes | length), edges: (.edges | length)}'
```

**Expected:** `{ nodes: N, edges: M }` — at minimum the seeded nodes (AuthService, UserService, PaymentService, ApiGateway, etc.).

### 4.2 Get specific node
```bash
curl -s http://localhost:3001/api/graph/node/AuthService | jq .
```

**Expected:** `{ node: { id: "AuthService", type: "service", ... }, neighbors: [...] }`

### 4.3 Node with neighbors
```bash
curl -s http://localhost:3001/api/graph/node/AuthService | jq '.neighbors | length'
```

**Expected:** ≥ 3 (UserService, ApiGateway, ТЗ-047_OAuth, Jasur_Senior, Alibek_Junior).

### 4.4 Non-existent node → 404
```bash
curl -s http://localhost:3001/api/graph/node/FakeService | jq .
```

**Expected:** `{ statusCode: 404, message: "Node \"FakeService\" not found" }`

### 4.5 Gap node appears after chat (verify §2.3 side-effect)
```bash
curl -s http://localhost:3001/api/graph/snapshot | jq '.nodes[] | select(.type == "gap")'
```

**Expected:** At least one gap node created after repeated questions about `AuthService`.

---

## 5. Doc Generator

### 5.1 Generate a doc
```bash
curl -s -X POST http://localhost:3001/api/docs/generate \
  -H "Content-Type: application/json" \
  -d '{
    "featureId": "auth-service",
    "code": "export class AuthService { validateToken(token: string): boolean { return jwt.verify(token, SECRET); } }",
    "language": "TypeScript"
  }' | jq '{id, featureId, title, generatedAt}'
```

**Expected:** `{ id: "...", featureId: "auth-service", title: "...", generatedAt: "..." }`  
This calls Gemini — may take 3–10 seconds.

```bash
DOC_FEATURE=auth-service
```

### 5.2 Get generated doc
```bash
curl -s http://localhost:3001/api/docs/$DOC_FEATURE | jq '{title, featureId}'
```

**Expected:** The doc created in §5.1.

### 5.3 List all docs
```bash
curl -s http://localhost:3001/api/docs | jq '.docs | length'
```

**Expected:** 1 (the one just created).

### 5.4 Delete doc
```bash
curl -s -X DELETE http://localhost:3001/api/docs/$DOC_FEATURE | jq .
```

**Expected:** `{ ok: true }`

Verify deletion:
```bash
curl -s http://localhost:3001/api/docs/$DOC_FEATURE | jq .
```

**Expected:** 404.

---

## 6. Code Review

### 6.1 Submit code for review
```bash
curl -s -X POST http://localhost:3001/api/review/check \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function login(user, pass) { const q = `SELECT * FROM users WHERE name='${user}'`; db.query(q); }",
    "sessionId": "'"$SESSION"'"
  }' | jq '{id, passed, score, summary}'
```

**Expected:** `passed: false`, `score < 50`, issues array containing SQL injection warning. May take 5–15 seconds (thinkingLevel: high).

```bash
REPORT_ID=$(curl -s -X POST http://localhost:3001/api/review/check \
  -H "Content-Type: application/json" \
  -d '{"code": "const x = 1 + 1; export default x;"}' | jq -r '.id')
```

### 6.2 Get report by ID
```bash
curl -s http://localhost:3001/api/review/$REPORT_ID | jq '{passed, score}'
```

**Expected:** Report returned correctly.

### 6.3 Non-existent report → 404
```bash
curl -s http://localhost:3001/api/review/nonexistent | jq .
```

**Expected:** 404.

---

## 7. Bug Analysis

### 7.1 Analyze code for bugs
```bash
curl -s -X POST http://localhost:3001/api/bugs/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(id) { const user = await db.findOne(id); return user.profile.name; }",
    "context": "UserService"
  }' | jq '{id, score, summary}'
```

**Expected:** risks array includes null-pointer / missing null-check risk.

### 7.2 Record a known bug
```bash
curl -s -X POST http://localhost:3001/api/bugs/record \
  -H "Content-Type: application/json" \
  -d '{
    "bugId": "BUG-001",
    "code": "user.profile.name",
    "fix": "user?.profile?.name ?? \"unknown\"",
    "description": "Null reference when user has no profile",
    "service": "UserService"
  }' | jq .
```

**Expected:** `{ ok: true }`

### 7.3 Get bug history
```bash
curl -s http://localhost:3001/api/bugs/history | jq '.history | length'
```

**Expected:** 1.

### 7.4 Analyze again — bug history enriches prompt
```bash
curl -s -X POST http://localhost:3001/api/bugs/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const name = user.profile.name;",
    "context": "UserService"
  }' | jq '.risks[] | select(.pastBugId != null)'
```

**Expected:** At least one risk references `pastBugId: "BUG-001"`.

---

## 8. SA Writer

### 8.1 Draft a spec
```bash
curl -s -X POST http://localhost:3001/api/sa/draft \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Сервис аутентификации — OAuth 2.0 + JWT. Нужно описать эндпоинты, flow авторизации и требования к токенам.",
    "templateId": "microservice-spec"
  }' | jq '{id, title, status}'
```

**Expected:** `{ id: "...", title: "...", status: "draft" }`

```bash
DOC_ID=$(curl -s -X POST http://localhost:3001/api/sa/draft \
  -H "Content-Type: application/json" \
  -d '{"description": "Payment service spec"}' | jq -r '.id')
```

### 8.2 Refine the draft
```bash
curl -s -X POST http://localhost:3001/api/sa/refine \
  -H "Content-Type: application/json" \
  -d "{
    \"draftId\": \"$DOC_ID\",
    \"edits\": \"Добавь секцию про rate limiting и опиши формат ошибок\"
  }" | jq '{id, status, updatedAt}'
```

**Expected:** `status: "draft"`, `updatedAt` is newer than `createdAt`.

### 8.3 Approve the doc
```bash
curl -s -X PATCH "http://localhost:3001/api/sa/$DOC_ID/approve" | jq '{id, status}'
```

**Expected:** `{ status: "approved" }`

### 8.4 List templates
```bash
curl -s http://localhost:3001/api/sa/templates | jq '.templates | length'
```

**Expected:** ≥ 1.

### 8.5 Approve non-existent doc → 404
```bash
curl -s -X PATCH "http://localhost:3001/api/sa/fake-id/approve" | jq .
```

**Expected:** 404.

---

## 9. Simulation

### 9.1 Start simulation
```bash
curl -s -X POST http://localhost:3001/api/simulation/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "'"$SESSION"'"}' | jq .
```

**Expected:** `{ ok: true }`

### 9.2 Subscribe to event stream (keep open ~30s)
```bash
curl -s -N http://localhost:3001/api/simulation/stream
```

**Expected:** Events arrive every few seconds:
```
data: {"event":"commit","payload":{"author":"...","message":"...","files":[...]}}
data: {"event":"ticket","payload":{"id":"PROJ-...","title":"..."}}
data: {"event":"pr_comment","payload":{"author":"...","comment":"..."}}
```

### 9.3 Graph updates after simulation
Wait 10 seconds after starting simulation, then:
```bash
curl -s http://localhost:3001/api/graph/snapshot | \
  jq '[.nodes[] | select(.type == "ticket")] | length'
```

**Expected:** ≥ 1 ticket node created by simulation.

### 9.4 Stop simulation
```bash
curl -s -X POST http://localhost:3001/api/simulation/stop | jq .
```

**Expected:** `{ ok: true }`

---

## 10. Frontend — UI Flows

Start frontend: `cd apps/web && bun dev`

### 10.1 Onboarding flow
1. Open `http://localhost:3000`
2. Enter name and select **Junior Backend**
3. Click submit
4. **Expected:** Transition animation plays, `ChatWorkspace` loads with 3-panel layout
5. Learning Path sidebar shows 3 steps, none completed

### 10.2 All 5 roles available
On the onboarding screen verify the role selector contains:
- Junior Backend, Junior Frontend, QA Engineer, **Tech Lead**, **Solution Architect**

### 10.3 Chat message + streaming
1. Type "Что такое AuthService?" in the chat input
2. **Expected:**
   - Typing indicator (three dots) appears immediately
   - Text streams in token by token
   - Source tags appear below the message after done
   - No page reload or error

### 10.4 Dependency alert in UI
1. Type "Я меняю UserService — рефакторинг интерфейса"
2. **Expected:**
   - Alert appears in the right MetaPanel before or during the response
   - Alert card has orange/red left border
   - "×" mark-read button is visible on the alert

### 10.5 Mark alert as read
1. After an alert appears in MetaPanel
2. Click "×" on the alert card
3. **Expected:** Card fades to ~55% opacity, red unread badge in header decrements

### 10.6 Gap detection badge
1. Ask "Как работает AuthService?" three times
2. After the 3rd message:
   - **Expected:** A `gap_detected` alert appears in MetaPanel
   - GraphNodeCard for `AuthService` in the bottom panel shows a question count badge

### 10.7 Learning Path step toggle
1. Click on a step in the left sidebar to expand/toggle
2. **Expected:** Step checkbox state toggles, PATCH request fires to `/api/onboarding/:sessionId/step/:stepId`

### 10.8 Mobile layout
1. Resize browser to < 768px
2. **Expected:**
   - Header bar appears with "Steps (x/y)" and "Alerts (n)" buttons
   - Left sidebar and MetaPanel are hidden
   - Tapping "Steps" opens drawer from left with overlay
   - Tapping "Alerts" opens drawer from right
   - Tapping backdrop closes drawers

### 10.9 Lead Report page
1. After completing §10.4 (so alerts exist), navigate to `http://localhost:3000/report/<sessionId>`
2. **Expected:**
   - Three stat cards: Total Alerts, Unread, Gap Nodes
   - "By Type" section shows alert breakdown
   - "Knowledge Gaps" section lists nodes with count
   - "Recent Alerts" shows last 10 alerts with severity borders

### 10.10 `/chat/[sessionId]` direct navigation
1. Copy a `sessionId` from a previous onboarding
2. Navigate directly to `http://localhost:3000/chat/<sessionId>`
3. **Expected:** ChatWorkspace loads (picks up session data or falls back to `getLearningPath`)

---

## 11. Error Scenarios

### 11.1 Missing API key
If `GEMINI_API_KEY` is invalid/missing, send a chat message:
```bash
curl -s -N -X POST http://localhost:3001/api/chat/$SESSION/message \
  -H "Content-Type: application/json" \
  -d '{"content": "test"}' | grep -a "error"
```
**Expected:** `data: {"type":"error","content":"Ошибка генерации ответа. Проверьте GEMINI_API_KEY..."}`

### 11.2 Concurrent requests
Open two terminal tabs and send messages simultaneously from the same session. Both should stream independently without interfering.

### 11.3 Very long message
```bash
LONG=$(python3 -c "print('A' * 5000)")
curl -s -X POST http://localhost:3001/api/chat/$SESSION/message \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$LONG\"}" | head -c 200
```
**Expected:** Streams a response (may be truncated by LLM context, but no 500 error).

---

## 12. Checklist Summary

| Area | Test | Pass |
|------|------|------|
| Health | `GET /health` returns ok | ☐ |
| Onboarding | Start session for all 5 roles | ☐ |
| Onboarding | Progress reflects completed steps | ☐ |
| Onboarding | 404 for missing session | ☐ |
| Chat | SSE streams token events | ☐ |
| Chat | Dependency alert fires for UserService | ☐ |
| Chat | Gap detection fires at 3rd question | ☐ |
| Chat | Empty message → 400 | ☐ |
| Alerts | markRead updates state | ☐ |
| Alerts | Report aggregates correctly | ☐ |
| Graph | Snapshot returns seeded nodes | ☐ |
| Graph | Node detail includes neighbors | ☐ |
| Graph | 404 for missing node | ☐ |
| Docs | Generate → get → delete lifecycle | ☐ |
| Review | SQL injection flagged as critical | ☐ |
| Bugs | Record enriches next analysis | ☐ |
| SA | Draft → refine → approve lifecycle | ☐ |
| Simulation | Events stream over SSE | ☐ |
| Simulation | Graph gains ticket nodes | ☐ |
| UI | All 5 roles in onboarding selector | ☐ |
| UI | Streaming with typing indicator | ☐ |
| UI | Alerts sorted by severity | ☐ |
| UI | Unread badge decrements on mark-read | ☐ |
| UI | Mobile drawer layout | ☐ |
| UI | `/report/[sessionId]` renders | ☐ |
