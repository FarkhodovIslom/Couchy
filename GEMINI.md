# 🛋️ Kibo — Project Context

## Project Overview
**Kibo** is an intelligent AI assistant designed for corporate developer education and onboarding. It serves as the "living memory" of a team, knowing the codebase, technical specifications, and internal processes in real-time.

- **Primary Goal:** Reduce developer onboarding time from 2 weeks to 3 days.
- **Core Strategy:** Use agentic logic to answer questions, detect knowledge gaps, and provide proactive alerts about code dependencies.

## Architecture & Tech Stack
The project is organized as a **Turborepo** monorepo:

### 📂 Apps
- **`apps/web`**: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons. Features a modern dark theme with Glassmorphism design.
- **`apps/api`**: NestJS running on **Bun**. Orchestrates LLM interactions, memory management, and knowledge graph operations.

### 📂 Packages
- **`packages/shared`**: Single source of truth for TypeScript interfaces (Alerts, Graphs, Messages, Onboarding, Sessions).

### 📂 Data & Memory
- **Knowledge Graph**: SQLite (`better-sqlite3`) for storing relationships between services, specs, and reports.
- **Long-Term Memory**: Plain Markdown files (`memory/MEMORY.md`) using an OpenClaw-style auto-flush mechanism.
- **LLM**: Gemini 3.5 Flash (`gemini-3.5-flash`) via `@google/generative-ai`.

## ⚡ Key Commands
- `npm install`: Install dependencies for the entire monorepo.
- `npm run dev`: Start both frontend (port 3000) and backend (port 3001) in development mode.
- `npm run build`: Build all applications and packages.
- `npm run lint`: Run linting across the workspace.

## 🛠️ Development Conventions
- **Type Safety:** Always use shared types from `@kibo/shared` for cross-app communication.
- **API Prefix:** All backend routes are prefixed with `/api`.
- **CORS:** Enabled for all origins in development to facilitate frontend-backend integration.
- **Streaming:** The assistant uses SSE (Server-Sent Events) for real-time response streaming.
- **Visuals:** Obsidian-style graph visualization for the knowledge graph.

## 🎭 Demo Scenario Flow
1. **Onboarding**: User enters name and role.
2. **Learning Path**: 3-step personalized track is generated.
3. **Q&A**: Agent answers questions with SSE streaming and attaches graph sources.
4. **Gap Detection**: Repeated questions trigger "Gap Detection" alerts.
5. **Proactive Alerts**: Notifies about dependencies when code changes are mentioned (e.g., "I changed UserService").
