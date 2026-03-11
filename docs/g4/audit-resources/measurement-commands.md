# Audit Measurement Commands

## Environment

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
curl -sS http://localhost:3000/health
curl -sS http://localhost:5173
```

## Type Safety

TypeScript AST-based scan over `web/`, `api/`, and `shared/`.

Strict-mode count forced at the CLI:

```bash
pnpm --filter @ship/shared exec tsc --noEmit --strict --pretty false
pnpm --filter @ship/api exec tsc --noEmit --strict --pretty false
pnpm --filter @ship/web exec tsc --noEmit --strict --pretty false
```

## Bundle Size

```bash
pnpm --filter @ship/web exec vite build --sourcemap
```

## API Response Time

Representative endpoints selected from real browser network traffic after login. Benchmarked with `ab` after restarting the API between runs to avoid dev rate-limit contamination.

## Database Query Efficiency

```sql
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();
```

## Tests

```bash
pnpm test
pnpm --filter @ship/web test
PLAYWRIGHT_WORKERS=2 pnpm test:e2e
```

## Accessibility

Major pages tested:

- `/docs`
- `/issues`
- `/my-week`
- `/documents/:id`

Tools used:

- Lighthouse
- axe-core via browser automation
- keyboard navigation sweep
