# 🛋️ Couchy — AI-ассистент для командного обучения разработчиков

> **Build with AI EdTech Hackathon 2026** · Трек: Corporate Education
> New Uzbekistan University · 23–24 мая · Дедлайн: 14:30 24 мая

[Russian Version](#-о-проекте) | [English Version](#-about-the-project) | [Technical Architecture](#-technical-architecture)

---

## 💡 О проекте

**Couchy** — это умный AI-агент, который знает всю кодовую базу, технические задания (ТЗ), бизнес-требования (БТ) и внутренние процессы команды в реальном времени. Он выступает в роли живой памяти команды с агентной логикой и обучает нового разработчика прямо во время работы, снимая нагрузку с Тимлида.

**Главная метрика проекта:** сокращение времени онбординга с 2 недель до 3 дней.

---

## 🌍 About the Project

**Couchy** is an intelligent AI agent that understands your entire codebase, technical specifications, and internal team processes in real-time. It acts as the team's "living memory," providing agentic guidance to onboard new developers directly within their workflow, significantly reducing the burden on Team Leads.

**Core Metric:** Reducing onboarding time from 2 weeks to 3 days.

---

## 🛠️ Технологический стек / Tech Stack

Проект организован в виде монорепозитория (**Turborepo**):

```
Couchy/ (Monorepo)
├── apps/
│   ├── web/          # Next.js (App Router) + Tailwind CSS
│   └── api/          # NestJS + Bun (High-performance runtime)
├── packages/
│   └── shared/       # Shared TypeScript interfaces (Single Source of Truth)
└── memory/           # OpenClaw-style plain Markdown storage
```

| Слой / Layer | Технология / Technology |
|---|---|
| **LLM** | Gemini 3.5 Flash (`gemini-3.5-flash`) |
| **Long-Term Memory** | Plain Markdown + auto-flush (OpenClaw-style) |
| **Knowledge Graph** | SQLite (`better-sqlite3`) — graph-based context |
| **Backend** | NestJS on **Bun** runtime |
| **Frontend** | Next.js 14 (App Router) + Framer Motion |

---

## 🏗️ Technical Architecture

### 🧠 Agent Logic (`apps/api`)
The backend is a modular NestJS application that leverages:
- **`AgentService`**: The orchestrator. It performs RAG (Retrieval-Augmented Generation) by combining Knowledge Graph context, session history, and Long-Term Memory.
- **`GraphService`**: Manages a SQLite-backed knowledge graph. It tracks user queries to detect **Knowledge Gaps** and provides structural context for AI answers.
- **`MemoryService`**: Implements **OpenClaw-style memory**. Knowledge is persisted in human-readable Markdown files (`MEMORY.md`, `/sessions`, `/daily`), making it Git-friendly and easily auditable.
- **`AlertsService`**: Real-time safety engine. It detects if a developer is repeatedly asking the same question (Gap) or if they intend to modify a critical service with complex dependencies (Proactive Alert).

### 🎨 Frontend Experience (`apps/web`)
A modern, dark-themed dashboard featuring:
- **Real-time Streaming**: Uses **Server-Sent Events (SSE)** for AI responses and the simulation feed.
- **Simulation Engine**: Mimics real-world developer activity (commits, PRs, CI/CD events) to demonstrate how the agent reacts to changes in real-time.
- **Graph Visualizer**: An interactive view of the Knowledge Graph, highlighting relationships between services and technical specs.

---

## ⚡ Быстрый запуск / Quick Start

### Требования / Prerequisites
- **Node.js** (v18+)
- **Bun** (v1.x)

### 1. Установка / Installation
```bash
npm install
```

### 2. Запуск / Run
```bash
npm run dev
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3001](http://localhost:3001)

---

## 🎭 Demo Scenario

1. **Onboarding**: Start as "Alibek" (Junior Backend Dev).
2. **Interactive Track**: Follow the 3-step learning path in the sidebar.
3. **Smart Q&A**: Ask *"Why use JWT instead of sessions?"*. The agent streams an answer with linked Knowledge Graph sources.
4. **Gap Detection**: Ask the same question 3 times to trigger a **Knowledge Gap** alert in the meta-panel.
5. **Proactive Warning**: Say *"I've modified UserService"*. The agent detects the impact on `AuthService` based on the graph and issues a warning.

---

## 🎯 Метрики и Фичи / Key Features
1. **Couchy Real-Time Context**: Local Markdown context injection.
2. **OpenClaw-style Memory**: Automatic session-to-file flushing.
3. **Dependency Risk Mitigation**: Proactive warnings for cross-service changes.
4. **Knowledge Gap Analytics**: Automatic detection of onboarding bottlenecks.
