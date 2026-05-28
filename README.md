# Survey App

Fullstack платформа для опросов. Монорепозиторий: бэкенд на NestJS + Prisma и фронтенд на React + Vite, всё оркестрировано через Docker Compose. На каждый push в `main` происходит деплой на тестовый VPS, на каждый pull request — отдельный Vercel-превью.

---

## Фичи

### Аутентификация и сессии
- Регистрация, вход, выход, обновление токена.
- JWT access + refresh токены в `HttpOnly` cookies; ротация refresh-токенов (одноразовые, аннулируются после использования).
- UI учитывает роль: раздел «Staff» в сайдбаре видят только пользователи с `ADMIN`.

### Опросы
- **Мои опросы** на [`/dashboard`](frontend/src/routes/dashboard/MyPollsTab) — список ваших опросов с количеством ответов, бейджами статуса, кнопками Activate/Deactivate, Copy link, Analytics, Edit, Delete.
- **Создание / редактирование** через [`/dashboard/polls/new`](frontend/src/routes/dashboard/PollForm) и `/dashboard/polls/:id/edit` — поддерживаются одиночный выбор, множественный выбор и свободный текст. Метаданные (title, description, visibility, `expiresAt`, active toggle) всегда доступны для правки.
- **Блокировка структуры после ответов.** Как только приходит первый ответ, *структура* опроса (вопросы и варианты) блокируется — заголовок/описание/видимость/активность остаются редактируемыми. Форма показывает баннер и отключает заблокированные поля. На бэкенде это дополнительно валидируется ошибкой `409 POLL_LOCKED_HAS_RESPONSES`.
- **Аналитика по опросу** на `/dashboard/polls/:id/analytics` (модалка) — общее число ответов, разбивка по вопросам с пропорциональными прогресс-барами для вариантов и подсчётом для текстовых ответов.

### Публичная страница ответа
- Анонимные респонденты отвечают на [`/p/:slug`](frontend/src/routes/public).
- Дедупликация по cookie — повторная отправка из того же браузера получает `409 ALREADY_RESPONDED`.
- Неактивные или просроченные опросы рендерятся в режиме «только чтение» («This poll has closed»).

### Админ-панель (`role === 'ADMIN'`)
- **All users** на [`/dashboard/all-users`](frontend/src/routes/dashboard/UsersTab) — пагинированная таблица, в каждой строке селектор роли (USER ↔ ADMIN), массовый выбор + массовое удаление, CSV-экспорт (`id,name,email,role,createdAt` с UTF-8 BOM и экранированием по RFC-4180). Защита: админ не может удалить сам себя; система отказывается оставить систему без последнего админа.
- **All polls** на [`/dashboard/all-polls`](frontend/src/routes/dashboard/AllPollsTab) — все опросы воркспейса с тем же набором действий, что и у владельца (Deactivate / Edit / Analytics / Delete), но через admin-эндпоинты.
- Смена роли инвалидирует refresh-токены затронутого пользователя — ему нужно перелогиниться, чтобы увидеть ссылку на админ-панель.

### Настройки (модалка на `/dashboard/settings`)
Шесть секций: Profile, Password, Email notifications, Appearance, Sessions, Danger zone (удаление аккаунта). Каждая секция сохраняется независимо.

### UI-примитивы
Кастомные примитивы на Tailwind в [`frontend/src/components/primitives/`](frontend/src/components/primitives) — без сторонних headless-библиотек, всё своё:
- **DataTable** — обобщённая таблица с конфигом колонок и опциональным выбором строк; используется и в users, и в all-polls.
- **Breadcrumbs** — хлебные крошки над заголовком страницы в липком TopBar, считаются по роуту.
- **DateField** — datetime-инпут с собственной календарной попап-выборкой (навигация по месяцам, выделение «сегодня» и выбранного дня, поле времени активируется только после выбора даты).
- **Select**, **Modal** (липкий футер + крестик), **Button**, **Avatar**, **Badge**, **Card**, **Field**, **Input**, **Textarea**, **Spinner**, **ConfirmDialog**.

### Поиск (⌘K)
Полноэкранная модалка поиска открывается из сайдбара или по `Cmd/Ctrl+K`. Сейчас это заглушка с моковыми результатами по полям polls/people/pages — но клик по строке реально навигирует через роутер. Реальный поиск-бэкенд — TODO.

### CI/CD
- [`deploy.yml`](.github/workflows/deploy.yml) — на push в `main` собирает Docker-образы бэкенда и фронтенда, пушит в GHCR, заходит по SSH на тестовый VPS и поднимает `docker compose up -d`. Фронтенд пересобирается с `VITE_API_BASE_URL=https://api.andreevxdr.ru/v1`.
- [`vercel-preview.yml`](.github/workflows/vercel-preview.yml) — на каждый PR (open/sync/reopen) собирает фронт через Vercel CLI, деплоит в Preview-окружение Vercel, привязывает алиас `pr-<n>.survey.andreevxdr.ru` и постит липкий комментарий в PR со ссылкой. На закрытие PR комментарий обновляется на сообщение о выводе превью из эксплуатации.

### Тесты
- Бэкенд: Jest, unit + e2e наборы (auth, polls, responses, analytics, admin).
- Фронтенд: Vitest, компонентные тесты для примитивов и хуков.
- Playwright-сценарии в [`frontend/tests/`](frontend/tests/): полный цикл (регистрация → создание опроса → анонимный ответ → видим в аналитике) и промоут админом (админ повышает пользователя → тот видит ссылку на админ-панель после перелогина).

---

## Быстрый старт (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Фронтенд: http://localhost:5173
- API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/docs
- Postgres в compose: хост-порт `5433` (чтобы не конфликтовать с локальным Postgres на `5432`).

При первом запуске создаётся seed-админ из `ADMIN_EMAIL` / `ADMIN_PASSWORD` (по умолчанию `admin@polls.local` / `admin`).

## Локально, без Docker

Нужен Node 20 (`.nvmrc`) и Postgres на `localhost:5432` с ролью `polls` и БД `survey_app`.

```bash
# Одноразовая настройка БД (под суперпользователем):
#   CREATE ROLE polls WITH LOGIN PASSWORD 'polls';
#   ALTER USER polls CREATEDB;          -- нужно для shadow DB Prisma в dev
#   CREATE DATABASE survey_app OWNER polls;

npm install
npm run db:migrate
npm run db:seed
npm run dev          # бэкенд (:3000) + фронт (:5173) параллельно
```

## Скрипты (из корня репозитория)

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

## Стек

**Бэкенд:** NestJS, Prisma, PostgreSQL 16, JWT (access + refresh) в `HttpOnly` cookies, `class-validator`, `@nestjs/swagger`.

**Фронтенд:** React 19, Vite, Tailwind, TanStack Query, `openapi-fetch`, react-router-dom, react-hook-form + zod, sonner.

**Инфра:** Docker Compose (dev + prod), GHCR (реестр образов), SSH-деплой на VPS (продакшен), Vercel (PR-превью).

## Сгенерированные артефакты в git

- `openapi.json` — контракт API, экспортированный из NestJS Swagger.
- `frontend/src/api/schema.ts` — TS-типы, сгенерированные из `openapi.json` через `openapi-typescript`.

Оба коммитятся, чтобы изменения контракта были видны в PR.

## Структура проекта

```
backend/           Приложение NestJS + Prisma-схема + e2e тесты
frontend/          Приложение React + Vite
  src/components/primitives/   Кастомные UI-примитивы на Tailwind
  src/layouts/DashboardShell/  TopBar, Sidebar, модалки
  src/routes/                  Компоненты роутов
  tests/                       Playwright-сценарии
docs/              Спеки и планы реализации
.github/workflows/ deploy.yml (прод) + vercel-preview.yml (PR-превью)
```
