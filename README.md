# Kibo — The Intelligent Nervous System for Your Engineering Team

> **Build with AI EdTech Hackathon 2026** · Track: Corporate Education
> New Uzbekistan University · May 23–24 · Deadline: 14:30 May 24

[Russian Version](#-о-проекте) | [English Version](#-about-the-project) | [Architecture & Features](#-technical-architecture)

---

## О проекте

**Kibo** — это не просто чат-бот, это автономная нервная система для вашей инженерной команды. Kibo знает всю вашу кодовую базу, историю багов, технические задания (ТЗ) и внутренние процессы в реальном времени. Выступая в роли "живой памяти" с агентной логикой, он автоматически обучает новых разработчиков, ревьюит код на соответствие архитектуре, пишет ТЗ и предсказывает риски. 

**Главная метрика проекта:** сокращение времени онбординга с 2 недель до 3 дней, а также высвобождение до 40% времени Тимлида.

---

## About the Project

**Kibo** is an intelligent AI nervous system for engineering teams. It understands your entire codebase, technical specifications, bug history, and internal processes in real-time. Acting as the team's "living memory", it provides agentic guidance to onboard new developers, reviews code against architectural standards, drafts System Architecture specs, and proactively predicts dependency risks.

**Core Metric:** Reducing onboarding time from 2 weeks to 3 days, while saving up to 40% of Team Lead time.

---

## Technical Architecture

[Comprehensive architecture](https://kibo-system-architecture.netlify.app)

---

## Ключевые Фичи (The AI Engine)

Kibo охватывает весь цикл разработки (SDLC) и поддержки команды:

1. **Smart Onboarding & Knowledge Gaps** 
   - Создает персонализированные планы обучения (Junior Backend, Frontend, QA, System Analyst, Team Lead).
   - Выявляет "Knowledge Gaps" (пробелы в знаниях), если разработчик задает похожие вопросы, и отправляет аналитику Тимлиду.

2. **AI Code Review & Architecture Enforcement** 
   - Автоматически проверяет код (PR/Commits) на соответствие системным требованиям (SA Specs) и локальным архитектурным паттернам, используя историю багов.
   
3. **Proactive Risk Mitigation & Alerts** 
   - Анализирует изменения в коде (например, в `UserService`) и через Knowledge Graph мгновенно предсказывает влияние на другие сервисы (`AuthService`), предупреждая разработчика до того, как код попадет в production.

4. **System Architecture (SA) Writer** 
   - Выступает в роли Системного Аналитика: автоматически генерирует структурированные спецификации на основе бизнес-описаний.

5. **Auto-Documentation Generator** 
   - Пишет актуальную техническую документацию к коду с учетом текущих ТЗ и контекста.

6. **OpenClaw-style Long-Term Memory** 
   - Вся "память" (архитектурные решения, процессы, договоренности) хранится в plain Markdown (`MEMORY.md`, `/daily`, `/sessions`), что делает систему прозрачной, версионируемой (Git) и легкой для аудита.

---

## Технологический стек / Tech Stack

Проект организован в виде монорепозитория (**Turborepo**) для обеспечения максимальной производительности и переиспользования кода:

| Слой / Layer | Технология / Technology |
|---|---|
| **AI / LLM** | Google Gemini 3.5 Flash (`gemini-3.5-flash`) |
| **Knowledge Graph** | SQLite (`better-sqlite3`) — graph-based context & dependency tracking |
| **Long-Term Memory** | Plain Markdown (`MEMORY.md`) + auto-flush (OpenClaw-style) |
| **Backend API** | NestJS on **Bun** (Ultra-fast runtime) |
| **Frontend Web** | Next.js 14 (App Router) + Tailwind CSS + Framer Motion |
| **Infrastructure** | Docker Compose + Nginx |

---

## Структура Проекта / Project Structure

```text
Kibo/ (Monorepo)
├── apps/
│   ├── web/          # Next.js Frontend (Dashboards, Chat, Graph Visualizer)
│   └── api/          # NestJS Backend (AI Orchestration, RAG, Alerts, Simulation)
│       └── src/
│           ├── core/     # Core AI: agent, rag, embed, classify, llm, memory, graph
│           └── modules/  # Features: alerts, bugs, chat, docs, onboarding, review, sa, simulation
├── packages/
│   └── shared/       # Shared TS Interfaces (UserRoles, Steps, Payloads)
└── memory/           # Long-Term Markdown Storage
```

---

## Быстрый запуск / Quick Start

### Требования / Prerequisites
- **Node.js** (v18+)
- **Bun** (v1.x)
- **Docker** (опционально, для запуска инфраструктуры)

### Локальный запуск (Local Development)

1. **Установка зависимостей / Installation:**
   ```bash
   npm install
   # или используйте bun install если настроено
   ```

2. **Настройка окружения:**
   Скопируйте пример окружения и добавьте ваш ключ:
   ```env
   # в корне или в apps/api/.env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Запуск через Turborepo:**
   ```bash
   npm run dev
   ```
   - Frontend: [http://localhost:8000](http://localhost:8000)
   - Backend API: [http://localhost:3001](http://localhost:3001)

### Запуск через Docker (Production Ready)

```bash
docker-compose up --build -d
```
Система поднимет API, Web-интерфейс и Nginx роутер на 80 порту.

---

## Сценарий для Жюри (Demo Scenario)

1. **Start as "Alibek" (Junior Backend Dev)**: Выберите роль на экране приветствия.
2. **Interactive Track**: Пройдите по 3-шаговому плану обучения в левом сайдбаре.
3. **Smart Q&A**: Спросите бота *"Why use JWT instead of sessions?"*. Kibo сгенерирует ответ в режиме реального времени (streaming), ссылаясь на конкретные технические задания из Knowledge Graph.
4. **Knowledge Gap Detection**: Задайте тот же или похожий вопрос 3 раза. Система автоматически классифицирует это как "Knowledge Gap" и отобразит Alert в Meta Panel для Тимлида.
5. **Proactive Dependency Warning**: Напишите *"I've modified UserService"*. Система проверит граф зависимостей и выдаст предупреждение о возможном влиянии на `AuthService`!
6. **Code Review & SA Draft**: Попросите бота сгенерировать спецификацию для новой фичи и проверьте, как он ревьюит кусок кода под неё.

---

*Создано с ❤️ для Build with AI EdTech Hackathon 2026.*
