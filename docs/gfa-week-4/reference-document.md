# Reference Document

This is the submission-facing index for the codebase orientation work completed before the audit. The full orientation notes used during the project are in [docs/g4/audit-resources/codebase-orientation-reference.md](../g4/audit-resources/codebase-orientation-reference.md).

## Orientation Coverage

The detailed orientation notes cover all checklist areas from the assignment:

- Repository overview and local startup path
- `web/`, `api/`, and `shared/` package boundaries
- Database schema, `documents` table, and `document_associations`
- Request tracing from the React UI through Express routes and SQL
- WebSocket and Yjs collaboration flow
- TypeScript patterns, strictness, and shared contracts
- Playwright and Vitest test infrastructure
- Docker, Terraform, and deployment expectations
- Architecture strengths, weaknesses, and scale-risk assessment

## Key Takeaways

- The repo is organized around a strict `web/ -> api/ <- shared/` split. The frontend owns rendering and editor UX, the API owns persistence and authorization, and `shared/` is the contract layer that keeps document and API shapes aligned.
- The core product model is the single `documents` table plus a `document_type` discriminator. Membership-style relationships mostly live in `document_associations`, while `parent_id` still handles true hierarchy.
- Request tracing is easiest when you start from one concrete UI action. For example, creating an issue flows from the React form, through the API route, into a transaction that inserts a `documents` row and companion `document_associations` rows, then back through shared response types.
- Real-time editing is cache-first and server-authoritative. The editor hydrates local Yjs state quickly, then merges with the collaboration server over WebSocket and clears stale cache when the server marks local state invalid.
- The codebase uses flexible database storage with stronger application-level TypeScript modeling. JSONB `properties` stay loose in Postgres, while discriminated unions in `shared/src/types/document.ts` recover type-safe behavior in the frontend and backend.

## Recommended Reading Order

If I had to onboard another engineer quickly, I would tell them to read in this order:

1. `shared/src/types/document.ts`
2. `api/src/db/schema.sql`
3. `docs/document-model-conventions.md`
4. One end-to-end route flow in `web/src` and `api/src/routes`
5. `web/src/components/Editor.tsx` and `api/src/collaboration/`

That sequence makes the rest of the repo much easier to reason about.

## Local Startup Path Used During The Audit

The most reliable local path during the audit was:

```bash
pnpm install
cp api/.env.example api/.env.local
cp web/.env.example web/.env
docker compose -f docker-compose.local.yml up --build -d
```

With that stack, the important local endpoints are:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- PostgreSQL: `localhost:5433`

## Architecture Map

```text
shared/
  Types and API contracts
   /                \\
  /                  \\
web/  <---- REST/WebSocket ---->  api/
React UI + editor                Express + DB + collaboration
```
