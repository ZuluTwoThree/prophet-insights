# Prophet Insights

Sovereign technology-forecasting dashboard with a standalone Node.js API, Lucia session auth, and PostgreSQL via Drizzle ORM.

## Stack

- Frontend: Vite + React + TypeScript
- Backend: Hono (Node.js)
- Auth: Lucia (session cookies)
- DB: PostgreSQL + Drizzle ORM

## Local development

1) Create `.env` from the example:

```sh
cp .env.example .env
```

2) Install dependencies:

```sh
npm install
```

3) Run the app:

```sh
npm run dev
```

Vite runs on `http://localhost:8080` and proxies `/api` to the Hono server on `http://localhost:8787`.

## Migrations

Generate migrations when the schema changes:

```sh
npm run db:generate
```

Apply migrations (requires build output):

```sh
npm run build
npm run db:migrate
```

## Production

```sh
npm run build
npm run start
```

For Docker + Hetzner deployment, see `DEPLOY.md`.
