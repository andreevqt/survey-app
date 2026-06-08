# Survey App

Fullstack платформа для создания и проведения опросов.

## Стек

**Бэкенд:** NestJS, Prisma, PostgreSQL 16, JWT (access + refresh) в `HttpOnly` cookies, `class-validator`, `@nestjs/swagger`.

**Фронтенд:** React 19, Vite, Tailwind, TanStack Query, `openapi-fetch`, react-router-dom, react-hook-form + zod, sonner.

**Инфра:** Docker Compose (dev + prod), GHCR (реестр образов), SSH-деплой на VPS (продакшен), Vercel (PR-превью).

## CI/CD
- [`deploy.yml`](.github/workflows/deploy.yml) — на push в `main` собирает Docker-образы бэкенда и фронтенда, пушит в GHCR, заходит по SSH на тестовый VPS и поднимает `docker compose up -d`. Фронтенд пересобирается с `VITE_API_BASE_URL=https://api.andreevxdr.ru/v1`.
- [`vercel-preview.yml`](.github/workflows/vercel-preview.yml) — на каждый PR (open/sync/reopen) собирает фронт через Vercel CLI, деплоит в Preview-окружение Vercel, привязывает алиас `pr-<n>.survey.andreevxdr.ru` и постит комментарий в PR со ссылкой. На закрытие PR комментарий обновляется на сообщение о выводе превью из эксплуатации.

## Запуск (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Фронтенд: http://localhost:5173
- API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/docs
- Postgres в compose: хост-порт `5433` (чтобы не конфликтовать с локальным Postgres на `5432`).

При первом запуске создаётся seed-админ из `ADMIN_EMAIL` / `ADMIN_PASSWORD` (по умолчанию `admin@polls.local` / `admin`).

## Локально (без Docker)

```bash
#   Первый запуск — настройка БД (под суперпользователем):
#   CREATE ROLE polls WITH LOGIN PASSWORD 'polls';
#   ALTER USER polls CREATEDB;          -- нужно для shadow DB Prisma в dev
#   CREATE DATABASE survey_app OWNER polls;

nvm use
npm install
npm run db:migrate
npm run db:seed
npm run dev          # бэкенд (:3000) + фронт (:5173) параллельно
```

## Скрипты

| Скрипт | Что делает |
|---|---|
| `npm run dev` | Бэкенд + фронт в dev-режиме |
| `npm test` | Jest (бэкенд) + Vitest (фронт) |
| `npm run test:e2e` | Playwright (по живому compose-стеку) |
| `npm run check:ts` | TS-чек обоих воркспейсов |
| `npm run lint` | ESLint обоих воркспейсов |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed первого админа |
| `npm run gen:api` | Экспорт OpenAPI спеки → перегенерация `frontend/src/api/schema.ts` |


## Сгенерированные файлы

- `openapi.json` — контракт API, экспортированный из NestJS Swagger.
- `frontend/src/api/schema.ts` — TS-типы, сгенерированные из `openapi.json` через `openapi-typescript`.

Оба коммитятся, чтобы изменения контракта были видны в PR.
`npm run gen:api` — для генерации


## Измерения и оценка

Количественные результаты (производительность, стоимость, качество LLM-аналитики, покрытие
тестами, до/после внедрения кэша ИИ) — в [docs/metrics/](docs/metrics/README.md). Все цифры
**измерены** на этом коде воспроизводимыми скриптами, а не оценены на глаз.

Короткая сводка:

- **Время отклика:** все ключевые эндпоинты — единицы миллисекунд на p95 (`docs/metrics/bench.mjs`).
- **ИИ-анализ, до/после кэша:** ~2924 мс (живой вызов DeepSeek) → ~5 мс (кэш-хит) — **≈585× быстрее**,
  стоимость повторного открытия неизменных данных **$0** вместо $0.00035.
- **Качество LLM:** на эталонном наборе (`eval/run-eval.mjs`) реальный DeepSeek vs детерминированный
  мок — sentiment 100% у обоих, recall тем **0.34 → 0.60**.
- **Тесты:** 81 unit + 5 e2e (бэкенд), 8 unit + 2 Playwright (фронт); сервис-логика покрыта на 85–100%.
- **Юзабилити-исследование:** готовый протокол на 5–10 человек (SUS + сценарии) —
  [docs/metrics/user-study-protocol.md](docs/metrics/user-study-protocol.md).
