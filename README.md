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

## Patent ingestion

- Import patents from BigQuery with `npx tsx scripts/ingest-patents.ts --limit=100 --pageSize=25 --startDate=2024-01-01`.
- Provide `--endDate=YYYY-MM-DD` to bound the query window and `--sourceFile=path/to/local.json` to ingest exported BigQuery data.
- BigQuery config is read from `GOOGLE_APPLICATION_CREDENTIALS` (service account JSON), `BIGQUERY_PROJECT_ID`, `BIGQUERY_LOCATION` (default `US`), `BIGQUERY_DATASET` (default `patents-public-data.patents`), and `BIGQUERY_TABLE` (default `publications`).
- A scheduled GitHub Actions workflow (`.github/workflows/patent-ingest.yml`) runs weekly and can be triggered manually to keep the database updated (requires a `DATABASE_URL` secret and BigQuery creds via `GOOGLE_APPLICATION_CREDENTIALS`).

## Production

```sh
npm run build
npm run start
```

For Docker + Hetzner deployment, see `DEPLOY.md`.
