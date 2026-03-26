# Implementation Constraints

## Stack And Runtime Baseline

Current baseline stack:

| Layer | Current implementation |
| --- | --- |
| Runtime | Node.js 20+ |
| Package manager | pnpm 10.x |
| Frontend | React 18 + Vite |
| Backend | Express |
| Database | PostgreSQL |
| DB access | `pg` direct SQL, no ORM |
| Shared contracts | TypeScript workspace package in `shared/` |
| Rich text | TipTap |
| Collaboration | Yjs + WebSocket |
| Client metadata cache | TanStack Query + IndexedDB persistence |
| Editor offline cache | y-indexeddb |

## Product-Architecture Constraints

1. Everything content-like should remain in the unified document model.
2. Reuse the shared editor/detail-page model instead of creating type-specific standalone editors.
3. Preserve `"Untitled"` as the default title contract.
4. Preserve `/documents/:id/*` as the canonical detail route for most document types.
5. Preserve workspace-level auth simplicity; do not introduce per-document ACLs unless intentionally redesigning the product.

## Data-Model Constraints

1. Use `document_associations` for organizational relationships.
2. Do not reintroduce the removed legacy `program_id`, `project_id`, or `sprint_id` core document columns.
3. Preserve the separation between authorization (`workspace_memberships`) and person-profile content (`documents` with `document_type='person'`).
4. Preserve the historical naming compatibility where the user-facing product says “week” but several persistence/contracts still say `sprint`.

## Database And Migration Constraints

1. Schema changes belong in numbered migration files under `api/src/db/migrations/`.
2. `schema.sql` is the bootstrap snapshot, not the place to mutate existing tables ad hoc.
3. The migration naming pattern is `NNN_description.sql`.
4. Migration history matters because several current concepts were renamed in-place over time.

## API Contract Constraints

1. All API routes should be represented in the OpenAPI surface.
2. Browser session flows use CSRF protection for state-changing routes.
3. Bearer token requests skip CSRF because they are not browser-auto-attached credentials.
4. Security headers, session cookies, and rate limiting are not optional extras; they are part of the current product contract.

## Security And Session Constraints

Current security behavior to preserve:

1. session-cookie auth with inactivity timeout
2. SameSite strict session cookies
3. CSRF token endpoint and enforcement for session mutations
4. stricter failed-login rate limiting
5. general API rate limiting
6. Helmet/CSP/HSTS protections
7. validated same-origin `returnTo` handling on login

## Collaboration And Caching Constraints

1. The server is the source of truth even though clients cache aggressively.
2. Query/list metadata uses stale-while-revalidate caching.
3. Rich content uses Yjs plus local IndexedDB cache with sync reconciliation.
4. Collaboration persistence must keep JSON content and extracted metadata aligned with Yjs state.
5. The editor must guard against stale-cache and cross-document contamination issues.

## Deployment Constraints

Current deployment truth:

1. canonical production baseline is AWS-backed
2. the public demo baseline is Railway
3. the Railway public demo auto-deploys from merged `master`
4. Render deployment scripts still exist as a legacy path

Implication for rebuild planning:

- A rebuilt product should preserve a clear separation between canonical production deployment and public-demo deployment behavior.

## Operational Constraints

1. Local PostgreSQL is expected for development and tests.
2. `pnpm dev` also handles database bootstrap/migration/seed helpers for fresh local environments.

## Known Transitional Areas

1. Several old context providers in the frontend are explicitly marked deprecated.
2. Compatibility redirects remain part of the current product surface.
3. Some schemas and docs still use historical “sprint” naming for week concepts.

## Rebuild Guidance

If an engineer is rebuilding the product from scratch, they should treat the following as non-negotiable current-state contracts:

1. unified document model
2. shared editor/collaboration substrate
3. weekly-accountability workflow
4. workspace/member/admin/auth model
