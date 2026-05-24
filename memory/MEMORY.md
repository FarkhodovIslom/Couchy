# Kibo AI — Архитектурная база знаний команды

Этот файл читается AI-агентом при каждом запросе. Содержит актуальный контекст команды, принятые решения и критические предупреждения.

---

## 👥 Команда

| Имя | Роль | Зона ответственности |
|-----|------|----------------------|
| Рустам | Solution Architect | Автор всех ADR, владелец EventBus, AnalyticsService |
| Камола | Tech Lead | UserService, OrderService, архитектурный контроль |
| Жасур | Senior Backend | AuthService, ApiGateway, PaymentService, код-ревью по безопасности |
| Алибек | Junior Backend | **Сейчас на онбординге.** Задача: TICKET-089 (Rate Limiting) |
| Дилноза | QA | E2E-тесты авторизации, заказов и уведомлений |

---

## 🏛️ Карта микросервисов

### ApiGateway (порт 443)
- Единая точка входа. Nginx + Lua. Маршрутизация, SSL-терминация.
- **Владелец:** Жасур
- Все внешние запросы проходят через него.

### AuthService (порт 3001)
- OAuth2 + PKCE. Access JWT (15 мин) + Refresh Token (7 дней, Redis).
- **Владелец:** Жасур. Stack: NestJS, PostgreSQL, Redis.
- ⚠️ **КРИТИЧЕСКИЙ БАГ в проде** — см. ТЗ-091. Hotfix в ревью у Жасура.
- Все мутации UserService требуют валидного Access JWT из этого сервиса.

### UserService (порт 3002)
- Профили пользователей, роли, настройки. Хранит PII-данные.
- **Владелец:** Камола. Stack: NestJS, PostgreSQL.
- Зависит от AuthService для валидации каждого входящего запроса.
- Любое изменение API UserService требует обновления ТЗ-047 и ревью Камолы.

### OrderService (порт 3003)
- Управление заказами: created → confirmed → paid → fulfilled → closed.
- **Владелец:** Камола. Stack: NestJS, PostgreSQL, RabbitMQ.
- На каждый переход статуса публикует событие в EventBus (exchange: orders.*).
- Зависит от UserService для проверки прав пользователя.

### PaymentService (порт 3004)
- Интеграция со Stripe и Payme. Async-подтверждение через webhook.
- **Владелец:** Жасур. Stack: NestJS, PostgreSQL, Stripe SDK.
- ТЗ-115 (retry-логика) сейчас в статусе draft — не реализована.
- Любые изменения PaymentService затрагивают ТЗ-102 (Order Lifecycle).

### NotificationService (порт 3005)
- Email, SMS, push через очередь RabbitMQ. Шаблонизатор: Handlebars.
- **Владелец:** Дилноза. Stack: NestJS, RabbitMQ, SendGrid.
- Не вызывается напрямую — только через EventBus.

### AnalyticsService (порт 3006)
- Агрегация событий бизнес-метрик. Хранилище: ClickHouse.
- **Владелец:** Рустам. Stack: NestJS, ClickHouse, RabbitMQ.
- Читает все события из EventBus. Read-only, не мутирует данные.

### EventBus (RabbitMQ)
- Шина событий. Exchanges: orders.*, payments.*, users.*.
- **Владелец:** Рустам. Все async-взаимодействия только через неё (ADR-002).
- Не вызывать сервисы напрямую для async-операций — только через очередь.

---

## 📄 Действующие спецификации

### ТЗ-047: OAuth2 + PKCE (✅ Approved)
- Authorization Code Flow с PKCE для всех внешних клиентов.
- Эндпоинты: POST /auth/login, POST /auth/token, POST /auth/logout, POST /auth/refresh.
- Access Token: JWT, RS256, payload: { sub, role, jti, exp }.
- Refresh Token: непрозрачный UUID, хранится в Redis с TTL 7 дней.

### ТЗ-089: Rate Limiting /auth/login (🔄 In Progress — Алибек)
- Лимит: 5 запросов в минуту с одного IP на /auth/login.
- При превышении: 429 Too Many Requests + Retry-After header.
- Реализация: Redis incr/expire как счётчик, ключ ratelimit:{ip}.
- Не затрагивает другие эндпоинты (только login).

### ТЗ-091: Refresh Token Logout Bug (🔴 CRITICAL — Prod)
- **Проблема:** при вызове /auth/logout Refresh Token не удаляется из Redis.
- Последствие: скомпрометированный Refresh Token можно использовать после logout.
- **Fix:** при logout читать jti из Access Token и удалять ключ из Redis: DEL refresh:{jti}.
- Assignee: Жасур. TICKET-091 в code review. Hotfix, не ждёт спринта.

### ТЗ-102: Order Lifecycle (✅ Approved)
- Статусная машина заказов: created → confirmed → paid → fulfilled → closed → cancelled.
- Событие на каждый переход: order.created, order.paid, order.fulfilled, etc.
- PaymentService слушает order.confirmed и инициирует оплату.

### ТЗ-115: Payment Retry Logic (📝 Draft — Камола)
- 3 попытки при сбое оплаты с экспоненциальным backoff: 1 мин, 5 мин, 30 мин.
- После 3 неудач: статус заказа — payment_failed, событие в NotificationService.
- Статус: draft, ещё не реализовано. TICKET-115, Sprint 13.

---

## ⚙️ Архитектурные решения (ADR)

### ADR-001: JWT вместо серверных сессий (принято 2026-03-10)
- **Решение:** Access JWT (RS256, 15 мин) + Refresh Token (Redis, 7 дней).
- **Почему:** stateless аутентификация для горизонтального масштабирования.
- **Следствие:** сервисы валидируют JWT локально по публичному ключу без обращения к AuthService.

### ADR-002: Event-Driven Architecture через RabbitMQ (принято 2026-04-02)
- **Решение:** все async-операции через RabbitMQ. Sync REST только для read-запросов.
- **Важно:** прямые HTTP-вызовы между сервисами для async-операций запрещены.

### ADR-003: Monorepo (Turborepo + Bun) (принято 2026-04-15)
- **Решение:** все сервисы в одном репо. Shared-типы через @kibo/shared.
- **Деплой:** Docker Compose, в планах Kubernetes.

---

## 🔴 Критические предупреждения

1. **ТЗ-091 (Production Bug):** Refresh Token не инвалидируется при logout. Не деплоить AuthService до мержа TICKET-091.
2. **UserService мутации:** любое изменение API UserService ломает OrderService и PaymentService. Обязательное ревью Камолы.
3. **PaymentService:** retry-логика (ТЗ-115) ещё не реализована — при сбое оплаты заказ зависает.
4. **EventBus:** без RabbitMQ не запустятся OrderService, PaymentService, NotificationService, AnalyticsService.

---

## 🚀 Текущий спринт (Sprint 12)

- TICKET-089 — Rate Limiting AuthService (Алибек, in progress)
- TICKET-091 — Fix Refresh Token Bug (Жасур, in review, hotfix)
- TICKET-115 — Payment Retry Logic (Камола, todo, Sprint 13)
