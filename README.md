# Kibo — The Intelligent Nervous System for Your Engineering Team

> **Build with AI EdTech Hackathon 2026** · Track: Corporate Education


---

## О проекте

**Kibo** — это не просто чат-бот, это автономная локальная нейросеть (ИИ) для вашей инженерной команды. Kibo знает всю вашу кодовую базу, историю багов, технические задания (ТЗ, БА, СА) и внутренние процессы в реальном времени. Все вычисления производятся **строго локально (on-premise)**, что полностью исключает утечку корпоративных данных и предотвращает использование сотрудниками сторонних ИИ-сервисов.

### Как это решает проблемы бизнеса?

**1. Онбординг без потери времени Лида**
Обычно, когда приходит новый сотрудник, тимлид отрывает время от разработки фичей и тратит свои ресурсы на онбординг (объяснение устройства компании, сервисов, шаблонов СА/БА, стиля кода, внутреннего сленга, названий внутренних сервисов, которых нет в интернете). Это приводит к прямым убыткам ресурсов бизнеса. 
Kibo берет эту задачу на себя. Он отвечает на все вопросы новичка, объясняет непонятные термины и логику работы сервисов. Это **сохраняет ресурсы компании** и позволяет лидам оставаться сфокусированными на разработке и митингах.

**2. Автоматическая генерация документации и экономия времени**
В среднем бэкенд-разработчики пишут документацию к коду, что требует как минимум час в день, то есть 5 часов ресурсов на написание документации в неделю. Kibo автоматизирует этот процесс: он изучает написанный код, ссылается на документы до разработки (БТ, БА, ТЗ, СА) и сам пишет подробный документ, изучая что и как работает.
Фронтендеры и тестировщики читают эту документацию, и если у них возникают вопросы — задают их напрямую Kibo, так как он в контексте. Это экономит ресурсы на уточнение данных у бэкендеров, их больше не триггерят вопросами.

**3. Умное Ревью Кода**
После написания документации Kibo проводит ревью кода. Он читает все документы до разработки (СА, БА) и проверяет, реализовано ли в коде всё, что было заявлено. ИИ подскажет, чего не хватает в коде из того, что было указано в СА.

**4. Прогнозирование багов на основе истории**
ИИ прогнозирует, какие баги могут возникнуть после релиза. Как он этому учится? Пример: бэкендер написал код, тестировщик не нашел багов, фичу релизнули в прод. Клиенты находят баг, бэкендер его ищет, исправляет и обновляет документацию с помощью ИИ. ИИ понимает, из-за какой фичи возник баг и как его исправили, тренируясь на этом случае. 
В будущем, если другой бэкендер будет писать код/документ, ИИ проанализирует контекст и сообщит: "Был такой случай, возник баг, и разработчик решил этот вопрос таким образом". Это прерывает повторяющийся цикл разработки (разработка - тест - релиз - возникновение бага - доработка - тестирование - релиз) и экономит ресурсы.

**5. Помощник Системного Аналитика**
Системные аналитики также могут использовать Kibo. Они просто объясняют всю суть задачи, а ИИ сам пишет для них СА, что значительно экономит ресурсы.

В целом нашей ИИ будут пользоваться все сотрудники компании, начиная с новых и доходя до разработчиков, что будет с каждым разом тренировать наш ИИ.

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