# Deploy to Hetzner (Docker Compose + Caddy)

## Prerequisites

- Docker + Docker Compose installed on the VPS
- A domain pointing to the VPS (A/AAAA records)

## 1) Configure environment

Update `docker-compose.yml` with your real values:

- `APP_URL` and `ALLOWED_ORIGIN`
- `DATABASE_URL`
- OAuth credentials

Update `Caddyfile` with your domain.

## 2) Start the stack

```sh
docker compose up -d --build
```

The app container runs database migrations on boot and then starts the API server.

## 3) Verify

```sh
docker compose ps
docker compose logs -f app
```

The API health check should respond at:

```
https://your-domain.tld/api/health
```

## Notes

- Postgres data is stored in the `pg_data` volume.
- Caddy automatically provisions HTTPS certificates.
