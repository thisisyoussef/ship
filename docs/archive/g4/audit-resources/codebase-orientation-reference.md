# Codebase Orientation Checklist Submission

## Project Summary

Ship is a government-oriented, Jira-like planning and execution system built on one hard premise: `everything is a document`.

Programs, projects, weeks, issues, plans, retros, and other work artifacts are all expressions of the same core model. TypeScript is what makes the philosophy practical. It carries the shared types, the type-specific behavior, and the conventions that keep one model usable across the frontend and backend.

This buys consistency and speed, but makes customization more expensive and raises the bar for engineering discipline.

## Key Architectural Decisions

- Ship uses one monorepo with `web/`, `api/`, and `shared/` instead of splitting the product into disconnected applications.
- The `documents` table is the backbone of the product. Different artifact types are distinguished by `document_type`, not separate primary tables for each concept.
- Type-specific detail lives mostly in `properties` JSONB, while the codebase uses TypeScript to make that flexible model practical.
- Most membership-style relationships now live in `document_associations` instead of legacy direct foreign-key columns.
- `parent_id` still exists for true hierarchy and direct child-content relationships.
- The editor stack is shared across document types rather than rebuilt separately for issues, projects, and weeks.
- Real-time collaboration is first-class: local editor state restores quickly, then Yjs merges live state over WebSocket.
- The system is server-authoritative, not truly local-first. Local persistence improves speed and resilience, but the backend remains the source of truth.
- Weekly planning and accountability are part of the product architecture, not just a team ritual around the product.
- The infrastructure choices are intentionally conservative: PostgreSQL, Express, React, AWS-native deployment, manual migrations, and E2E-heavy testing.

# Phase 1

## 1. Repository Overview

### 1.1 Clone the repo and get it running locally. Document every step, including anything that was not in the README.

I verified a Docker-based local startup path.

1. Clone the repository into `/Users/youss/Development/gauntlet/ship` and enter it.

```bash
git clone <REPO_URL> /Users/youss/Development/gauntlet/ship
cd /Users/youss/Development/gauntlet/ship
```

2. Start Docker Desktop and wait until it is fully running.

3. Verify Docker CLI access.

```bash
docker version
```

4. Start the local stack with both compose files.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

5. Confirm the services are healthy and reachable.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml ps
curl -sS http://localhost:3000/health
curl -sS http://localhost:5173 > /tmp/ship-web.html && head -n 5 /tmp/ship-web.html
```

6. Check application logs.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml logs --tail 80 api web
```

7. Open the local endpoints.

- Web: `http://localhost:5173`
- API docs: `http://localhost:3000/api/docs/`
- Health: `http://localhost:3000/health`

8. Use the seeded development login surfaced in the runtime logs.

- Email: `dev@ship.local`
- Password: `admin123`

9. Stop the stack when finished.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml down
```

What was missing or easy to miss:

- The reliable local startup command uses both compose files together: `docker-compose.yml` plus `docker-compose.local.yml`.
- The compose files may warn that `version` is deprecated. That warning is non-blocking.
- The first startup is slower than it looks because Docker has to pull base images and build `ship-api` and `ship-web`.
- Seed data runs automatically on startup, so the initial logs are part of normal boot.
- A healthy startup should show `ship-api-1` on port `3000`, `ship-web-1` on port `5173`, and `ship-postgres-1` healthy on mapped port `5433`.

Errors, workarounds, and environment quirks encountered:

- A stale local process on port `3000` can block startup with a `ports are not available` error. If that happens, stop the conflicting process and rerun `up -d`.
- Docker Desktop on macOS can become unresponsive when local storage is tight. If that happens, recover Docker first and then rerun the compose command.
- In one run, Docker left behind a protected metadata file under `~/Library/Containers/com.docker.docker` that prevented full manual deletion. That was an OS-level cleanup edge case, not an application-specific problem.

### 1.2 Read every file in the `docs/` folder. Summarize the key architectural decisions in your own words.

Ship is a government-oriented, Jira-like planning and execution system built around `everything is a document`.

The product treats programs, projects, weeks, issues, plans, retros, and wiki-style content as typed forms of one shared model. TypeScript is what makes the philosophy practical. The model buys consistency and speed, but makes customization more expensive and raises the bar for engineering discipline.

The editor, the API, the workflow logic, and the accountability layer are all built on top of the same shared document abstraction. Real-time collaboration is a core subsystem, not an add-on. Weekly planning and review are product architecture, not just process advice.

### 1.3 Read the `shared/` package. What types are defined? How are they used across the frontend and backend?

The `shared/` package is the contract layer.

The most important shared types live in `shared/src/types/document.ts` and `shared/src/types/api.ts`.

The document model includes:
- `DocumentType`, a shared union of document kinds such as `wiki`, `issue`, `program`, `project`, `sprint`, `person`, `weekly_plan`, `weekly_retro`, `standup`, and `weekly_review`
- `BelongsToType`, a shared union of relationship kinds: `program`, `project`, `sprint`, and `parent`
- `BelongsTo`, the shared application-level relationship shape
- a base `Document` interface plus typed variants such as `IssueDocument`, `ProjectDocument`, `WeekDocument`, `PersonDocument`, `WeeklyPlanDocument`, and `WeeklyReviewDocument`
- type-specific property interfaces such as `IssueProperties`, `ProjectProperties`, `WeekProperties`, `PersonProperties`, `WeeklyPlanProperties`, `WeeklyRetroProperties`, `StandupProperties`, and `WeeklyReviewProperties`

The API layer also shares generic response shapes such as `ApiResponse<T>`.

Across the frontend and backend, these types are shared in two ways:
- the frontend references `shared` as a TypeScript project reference
- the backend imports compiled output from `@ship/shared`

That means the shared package is not just a utility folder. It is the place where the application decides what a document, relationship, and API payload actually are.

### 1.4 Create a diagram of how the `web/`, `api/`, and `shared/` packages relate to each other.

```text
          shared/
     (types + contracts)
         /        \
        /          \
     web/  <----->  api/
  (React UI)      (Express + DB + collaboration)
        \          /
         \        /
      REST + WebSocket
```

In practical terms:
- `web/` renders the UI and editor experience
- `api/` owns persistence, relationships, visibility, authentication, and collaboration endpoints
- `shared/` keeps the document and API contracts from drifting apart
- `web/` talks to `api/` through REST and the collaboration socket, and both depend on `shared/`

## 2. Data Model

### 2.1 Find the database schema (migrations or seed files). Map out the tables and their relationships.

The primary schema lives in `api/src/db/schema.sql`.

Key migrations that explain the current relationship model include:
- `api/src/db/migrations/020_document_associations.sql`
- `api/src/db/migrations/027_drop_legacy_association_columns.sql`
- `api/src/db/migrations/029_drop_program_id_column.sql`
- `api/src/db/migrations/033_sprint_to_week_rename.sql`
- `api/src/db/migrations/037_week_dashboard_model.sql`

The main tables and their roles are:
- `workspaces`: tenant boundary and workspace-level settings such as `sprint_start_date`
- `users`: global identity records
- `workspace_memberships`: authorization layer linking users to workspaces
- `workspace_invites`: invite flow
- `sessions`: session auth state
- `oauth_state`: persisted OAuth flow state
- `audit_logs`: compliance and security logging
- `api_tokens`: token-based auth for external tools
- `documents`: core table for content and work artifacts
- `document_associations`: junction table for document-to-document structural and membership relationships
- `document_history`: field-level audit history for documents
- `document_snapshots`: preserved state for document conversions
- `sprint_iterations`: week-level work telemetry
- `issue_iterations`: issue-level work telemetry
- `files`: file metadata
- `document_links`: backlink graph between documents
- `comments`: threaded document comments

The important relationships are:
- `workspace_memberships.workspace_id -> workspaces.id`
- `workspace_memberships.user_id -> users.id`
- `documents.workspace_id -> workspaces.id`
- `documents.parent_id -> documents.id`
- `document_associations.document_id -> documents.id`
- `document_associations.related_id -> documents.id`
- `document_history.document_id -> documents.id`
- `document_snapshots.document_id -> documents.id`
- `document_links.source_id -> documents.id`
- `document_links.target_id -> documents.id`
- `comments.document_id -> documents.id`
- `comments.parent_id -> comments.id`
- `sprint_iterations.sprint_id -> documents.id`
- `issue_iterations.issue_id -> documents.id`

### 2.2 Understand the unified document model: how does one table serve docs, issues, projects, and sprints?

The mechanism is:
- one shared `documents` table
- one `document_type` discriminator
- one flexible `properties` JSONB payload
- shared content and collaboration fields for every type

The `documents` table contains fields that nearly all artifact types can share:
- `workspace_id`
- `document_type`
- `title`
- `content`
- `yjs_state`
- `parent_id`
- `position`
- `properties`
- `ticket_number`
- visibility and lifecycle timestamps

How this serves multiple product entities:
- an `issue` is a document row whose behavior is interpreted through `document_type = 'issue'` plus issue-shaped properties such as state, assignee, and estimate
- a `project` is a document row whose behavior is interpreted through `document_type = 'project'` plus project-shaped properties such as ICE scores and accountability fields
- a `sprint` is a document row whose behavior is interpreted through `document_type = 'sprint'` plus week-shaped properties such as `sprint_number` and `owner_id`
- a `wiki` page is the same table with a different type and a lighter property shape

This buys consistency and speed, but it makes customization more expensive and raises the bar for naming and type discipline.

### 2.3 What is the `document_type` discriminator? How is it used in queries?

`document_type` is:
- a PostgreSQL enum in `schema.sql`
- a shared TypeScript union in `shared/src/types/document.ts`
- a direct query discriminator across the route layer

Confirmed enum values are:
- `wiki`
- `issue`
- `program`
- `project`
- `sprint`
- `person`
- `weekly_plan`
- `weekly_retro`
- `standup`
- `weekly_review`

Routes query the same `documents` table and filter by `document_type`.

Representative patterns include:
- issues routes filtering with `document_type = 'issue'`
- week routes filtering with `document_type = 'sprint'`
- project routes counting related documents by joining `document_associations` and filtering joined rows by `document_type = 'issue'` or `document_type = 'sprint'`

The product language may say `week`, but the stored core document type is still `sprint`.

### 2.4 How does the application handle document relationships (linking, parent-child, project membership)?

The application uses three distinct relationship mechanisms.

#### A. `document_associations` for membership-style relationships

This is the current primary relationship mechanism for:
- program membership
- project membership
- sprint/week membership
- some parent-style relationships at the application layer

The table shape is:
- `document_id`
- `related_id`
- `relationship_type`

Confirmed relationship types are:
- `parent`
- `project`
- `sprint`
- `program`

This table is used when routes create issues, count project contents, return `belongs_to` data, or find sprint-related items.

#### B. `parent_id` for true hierarchy

`parent_id` still exists directly on `documents`.

That is used for actual hierarchical document trees and direct child relationships. It is distinct from the generic membership table.

#### C. `document_links` for backlinks and cross-links

`document_links` is separate from `document_associations`.
That means backlinks are treated as a graph feature, not as structural ownership.

At the application layer, these relationships are surfaced through the shared `BelongsTo` model, which is one of the places where TypeScript makes the philosophy practical.

## 3. Request Flow

### 3.1 Pick one user action and trace it from the React component through the API route to the database query and back.

The user action I traced was creating an issue.

The flow is:

1. In `web/src/components/IssuesList.tsx`, the UI action builds a `belongs_to` array from the current context and calls the create-issue mutation.
2. In `web/src/hooks/useIssuesQuery.ts`, `useCreateIssue()` wraps `createIssueApi()`.
3. `createIssueApi()` sends `apiPost('/api/issues', apiData)` with `title` and `belongs_to`.
4. In `web/src/lib/api.ts`, `apiPost()` goes through `fetchWithCsrf()`, which first ensures a CSRF token via `GET /api/csrf-token` and then performs the real POST with `credentials: 'include'` and `X-CSRF-Token`.
5. In `api/src/app.ts`, `/api/issues` is mounted behind `conditionalCsrf`, then handed to the issues router.
6. In `api/src/routes/issues.ts`, the create route is `router.post('/', authMiddleware, async (req, res) => { ... })`.
7. The route validates the body, opens a DB transaction, takes a per-workspace advisory lock, computes the next ticket number, inserts a new row into `documents`, inserts one row per relationship into `document_associations`, commits, and returns the created issue.
8. The frontend replaces the optimistic entry in the TanStack Query cache with the real issue and navigates to `/documents/:id`.

What this shows is that creating an issue is really creating a new document row plus relationship rows. The frontend and backend then interpret that row through the shared issue shape.

### 3.2 Identify the middleware chain: what runs before every API request?

The app-level middleware order in `api/src/app.ts` is:
- `helmet(...)`
- API rate limiting for `/api/*`
- `cors(...)`
- `express.json(...)`
- `express.urlencoded(...)`
- `cookieParser(sessionSecret)`
- `express-session`

After that, some route groups are mounted behind `conditionalCsrf`, and protected handlers then apply `authMiddleware` at the route level.

So the important architectural point is:
- authentication is not globally mounted for every route
- CSRF is applied at route-mount level for state-changing browser routes
- authorization and visibility checks happen inside protected route handlers or route-specific middleware

For the create-issue request specifically, the chain is:
- `helmet`
- API rate limiter
- `cors`
- body parsers
- `cookieParser`
- `express-session`
- `conditionalCsrf`
- `authMiddleware`
- request validation
- transaction and database writes

### 3.3 How does authentication work? What happens to an unauthenticated request?

Authentication is hybrid.

For browser use:
- the app relies on a `session_id` cookie stored in the database-backed session model used by the application itself
- `express-session` is still present, but mainly to support CSRF token storage rather than being the primary product-auth session source

For external/API-style access:
- Bearer API tokens are supported

In `api/src/middleware/auth.ts`, the middleware checks the session cookie and can also authenticate API tokens. If the request is unauthenticated, protected routes return `401`.

A subtle but important behavior is that some browser write routes will hit CSRF middleware before they reach route-level auth. That means a malformed or missing CSRF token can fail before the handler gets far enough to reject the user as unauthenticated.

# Phase 2

## 4. Real-time Collaboration

### 4.1 How does the WebSocket connection get established?

The client-side entrypoint is the editor layer in `web/src/components/Editor.tsx`.

When a document is opened, the editor creates:
- a fresh `Y.Doc`
- a local IndexedDB persistence provider
- a `WebsocketProvider` pointing at the collaboration server

The server-side entrypoint lives in `api/src/collaboration/index.ts`. That code handles the HTTP upgrade, authenticates the connection, checks document access, and binds the socket to the right shared room state.

The important architectural point is that a new `Y.Doc` is created per document. Reusing one Yjs document across multiple app documents would contaminate state.

### 4.2 How does Yjs sync document state between users?

Yjs handles synchronization through CRDT state exchange.

At a high level:
- each open document has a shared room `Y.Doc` on the server side
- clients connect through the WebSocket provider
- Yjs sync messages exchange document updates
- awareness messages carry presence and cursor state
- updates are rebroadcast to the other participants in the room

This means the app is not manually diffing text and resolving conflicts itself. It is relying on Yjs as the collaboration engine.

### 4.3 What happens when two users edit the same document at the same time?

There is no lock-based editing model.

Two users can edit the same document at the same time, and Yjs merges the changes through CRDT convergence. The model is not last-write-wins in the ordinary CRUD sense. It is concurrent shared-state editing.

That is exactly the right architectural choice for a collaborative document-heavy product like this one.

### 4.4 How does the server persist Yjs state?

The collaboration server persists multiple representations of document state:
- binary `yjs_state`
- JSON `content`
- extracted structured fields pushed into `properties`

That means the system preserves:
- the collaborative editing state needed for accurate live merges
- a normal JSON content representation the rest of the app can work with
- structured fields that support workflow logic and rollups

The persistence path in `api/src/collaboration/index.ts` is debounced rather than writing on every keystroke.

## 5. TypeScript Patterns

### 5.1 What TypeScript version is the project using?

The project is on `TypeScript ^5.7.2`.

That version is declared in:
- `package.json`
- `api/package.json`
- `web/package.json`
- `shared/package.json`

### 5.2 What are the `tsconfig.json` settings? Is strict mode on?

Strict mode is on.

The root `tsconfig.json` enables:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `isolatedModules: true`
- `declaration: true`
- `declarationMap: true`
- `sourceMap: true`

The web config also sets `strict: true`, uses `moduleResolution: 'bundler'`, and uses `jsx: 'react-jsx'`.

The API and shared packages extend the root config.

### 5.3 How are types shared between frontend and backend?

Types are shared through the `shared/` package.

The frontend references `shared` as a TypeScript project reference. The backend imports compiled output via `@ship/shared`. The `shared` package is marked `composite: true`, which is what makes the project-reference setup practical.

The end result is that document types, relationship shapes, and API payload shapes are shared across the stack instead of being duplicated separately in `web/` and `api/`.

### 5.4 Examples of generics, discriminated unions, utility types, and type guards

#### Generics

Representative examples include:
- `ApiResponse<T = unknown>` in `shared/src/types/api.ts`
- `PaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T)` in `api/src/openapi/schemas/common.ts`
- `SelectableList<T extends { id: string }>` in `web/src/components/SelectableList.tsx`

#### Discriminated unions

The clearest example is the document model in `shared/src/types/document.ts`.
Different variants such as `WikiDocument`, `IssueDocument`, `ProjectDocument`, and `WeekDocument` are all distinguished by the `document_type` field. That is a classic discriminated-union pattern.

#### Utility types

The strongest direct usage pattern I found is `Partial`.
Examples include:
- `DEFAULT_PROJECT_PROPERTIES: Partial<ProjectProperties>` in `shared/src/types/document.ts`
- `updateIssueApi(id: string, updates: Partial<Issue>)` in `web/src/hooks/useIssuesQuery.ts`

I did not find direct live usages of `Pick<...>` or `Omit<...>` in `web/`, `api/`, or `shared/` during the repo scan.

#### Type guards

Representative examples include:
- `isValidRelationshipType(value): value is RelationshipType` in `api/src/routes/associations.ts`
- `isCascadeWarningError(error): error is CascadeWarningError` in `web/src/hooks/useIssuesQuery.ts`

### 5.5 Other notable TypeScript patterns in the codebase

A few other patterns are worth calling out because they appear often in the repo’s style of thinking:
- `as const` arrays used to derive literal unions
- indexed access unions like `typeof validTypes[number]`
- TypeScript project references with `composite: true`
- generic schema factories around Zod

These are not decorative. They are part of how the codebase makes a flexible document model feel typed and controllable.

## 6. Testing Infrastructure

The repo has three distinct test layers.

- Root `pnpm test` runs the API Vitest suite.
- `pnpm --filter @ship/web test` runs the web Vitest suite.
- `pnpm test:e2e` runs the Playwright E2E suite.

That means the root `test` script is not the whole test surface.

### 6.1 How are the Playwright tests structured? What fixtures are used?

The main Playwright architecture is built around per-worker isolation.

From `playwright.config.ts`:
- test directory is `./e2e`
- `fullyParallel: true`
- global setup builds API and web once before all tests start
- worker count is normally derived from available memory and CPU
- traces are collected on first retry
- screenshots are captured on failure
- HTML reporting is enabled

The main E2E fixture is `e2e/fixtures/isolated-env.ts`.

That fixture gives each Playwright worker its own:
- PostgreSQL container via `@testcontainers/postgresql`
- API server process
- Vite preview server process

There is also a lighter `e2e/fixtures/dev-server.ts` fixture for running against already-running local dev servers, but that is not the main suite architecture.

Reusable helper utilities live in `e2e/fixtures/test-helpers.ts`. The most notable helpers are:
- `triggerMentionPopup(...)`
- `hoverWithRetry(...)`
- `waitForTableData(...)`

The local test-writing guidance in `e2e/AGENTS.md` makes the design intent clear: avoid fixed sleeps, assume parallelism, and make assertions retry-friendly.

### 6.2 How does the test database get set up and torn down?

There are two different database stories.

For API Vitest:
- `api/src/test/setup.ts` assumes `DATABASE_URL` already points at a real Postgres database
- before the suite, it truncates the application tables with `TRUNCATE ... CASCADE`
- `api/vitest.config.ts` disables file-level parallelism to avoid database conflicts across files

For Playwright E2E:
- each worker starts its own fresh Postgres container
- the worker fixture runs migrations
- then it seeds minimal but realistic test data
- when the worker finishes, the container is stopped in a `finally` block

That makes the Playwright suite much more self-contained than the API unit/integration suite.

### 6.3 Run the full test suite. How long does it take? Do all tests pass?

With the required environment in place, the results were:

#### API Vitest
- command: `pnpm test`
- result: passed
- duration: about `22s` including DB setup and migrations
- suite result: `28` test files passed, `451` tests passed

#### Web Vitest
- command: `pnpm --filter @ship/web test`
- result: failed
- duration: about `7s`
- suite result: `12` files passed, `4` files failed, `133` tests passed, `13` tests failed

The most visible failing areas were:
- `web/src/lib/document-tabs.test.ts`
- `web/src/components/editor/DetailsExtension.test.ts`

#### Playwright E2E
- command: `PLAYWRIGHT_WORKERS=2 pnpm test:e2e`
- result: failed
- duration: about `19.0m`
- suite result: `813` passed, `3` failed, `6` flaky, `47` did not run

The hard failures reported by Playwright were:
- `e2e/drag-handle.spec.ts`
- `e2e/my-week-stale-data.spec.ts`
- `e2e/program-mode-week-ux.spec.ts`

The flaky tests included:
- `e2e/inline-comments.spec.ts`
- `e2e/mentions.spec.ts`
- `e2e/project-weeks.spec.ts`
- `e2e/session-timeout.spec.ts`
- `e2e/team-mode.spec.ts`
- `e2e/weekly-accountability.spec.ts`

The testing strategy is clearly E2E-heavy and intentionally built around isolation, which fits a collaborative app like this one. The Playwright harness is much stronger than the top-level `pnpm test` script makes it look.

## 7. Build and Deploy

### 7.1 Read the Dockerfile. What does the build process produce?

The main production image is defined in `Dockerfile`.

It produces:
- a production API container image
- based on `public.ecr.aws/docker/library/node:20-slim`
- with production dependencies only
- containing prebuilt artifacts from `shared/dist/` and `api/dist/`
- exposing port `80`
- starting with `node dist/db/migrate.js && node dist/index.js`

The key point is that the production image does not compile the code from source inside Docker. It packages already-built backend artifacts.

There are also two development-oriented Dockerfiles:
- `Dockerfile.dev` for the API, which builds from source and runs migrations plus seed data
- `Dockerfile.web` for the frontend, which builds shared types and then runs the Vite dev server

So the runtime model is:
- production API is containerized
- local API and web can run in development containers
- frontend production deployment is handled differently from the API

### 7.2 Read the `docker-compose.yml`. What services does it start?

There are two compose files with different purposes.

`docker-compose.yml` starts only:
- `postgres`

It is an optional helper for local development if someone wants Docker-based PostgreSQL instead of a native local Postgres installation.

`docker-compose.local.yml` is the fuller local stack. It starts:
- `postgres`
- `api`
- `web`

In that local full-stack setup:
- Postgres runs on host port `5433`
- the API runs on `3000`
- the web frontend runs on `5173`

### 7.3 Skim the Terraform configs. What cloud infrastructure does the app expect?

The Terraform configuration is clearly AWS-native.

The app expects:
- a VPC with public and private subnets
- an Internet Gateway and NAT path
- VPC Flow Logs to CloudWatch
- security groups for ALB, Elastic Beanstalk instances, and Aurora
- Aurora PostgreSQL Serverless v2 in private subnets
- an Elastic Beanstalk Docker environment for the API
- an S3 bucket and CloudFront distribution for the frontend
- CloudFront behaviors for API routes, health checks, collaboration sockets, and event streams
- WAF at the CloudFront layer
- Kinesis-backed CloudFront real-time logging
- runtime configuration and secrets in SSM Parameter Store and Secrets Manager
- IAM permissions for SSM, Secrets Manager, and Bedrock access

The environment layout is three-way:
- `dev`
- `prod`
- `shadow`

`dev` and `shadow` reuse a shared VPC discovered from SSM. `prod` creates its own VPC. `shadow` is explicitly intended for isolated migration and UAT-style testing.

### 7.4 How does the CI/CD pipeline work, if configured?

There is no in-repo CI/CD pipeline configuration.

I did not find:
- GitHub Actions workflows
- CodeBuild buildspec files
- Jenkins configuration
- GitLab CI configuration
- CircleCI configuration

What does exist is a script-driven deployment flow:
- `scripts/deploy.sh` for the API
- `scripts/deploy-web.sh` for the frontend
- `scripts/deploy-infrastructure.sh` for Terraform infrastructure

That means the deployment model is operator-driven rather than push-triggered.

The API deploy script rebuilds `shared` and `api`, verifies migration artifacts, performs a local Docker build sanity check, packages a zip bundle, uploads it to S3, creates a new Elastic Beanstalk application version, and updates the EB environment.

So the honest architectural read is:
- there is deployment automation
- there is not a repository-hosted CI/CD pipeline
- release flow is still shell-script-and-AWS-CLI driven

# Phase 3

## 8. Architecture Assessment

### 8.1 What are the 3 strongest architectural decisions in this codebase? Why?

#### 1. The unified document model

This is the core bet of the whole system, and it is the strongest one.

Ship is a government-oriented, Jira-like planning and execution system built around the idea that everything is a document. Programs, projects, weeks, issues, plans, retros, and wiki content all live inside one conceptual model.

Why this is strong:
- it gives the product a single center of gravity instead of a pile of disconnected feature models
- it makes the editor, API shapes, relationships, and UI conventions reusable
- it lets the team move faster on new document-like features without rebuilding the world each time
- it creates a coherent product identity instead of separate systems for docs, tickets, and planning

#### 2. Treating collaboration as a platform feature, not a bolt-on

The shared editor plus Yjs plus WebSocket architecture is a real strength.

Why this is strong:
- collaboration is not implemented as a special case for one page
- the codebase clearly treats editing as infrastructure that multiple document types sit on top of
- local restore plus Yjs merge plus server persistence is the right shape for a document-heavy collaborative app
- the system preserves both raw collaborative state and structured extracted properties

#### 3. The Playwright isolation model for E2E testing

The testing ergonomics are uneven, but the E2E architecture itself is one of the better engineered parts of the repo.

Why this is strong:
- each Playwright worker gets its own Postgres container, API process, and preview server
- the fixture design takes state isolation seriously, which is exactly what this kind of app needs
- the team clearly learned from real flakiness and encoded those lessons into fixtures and guidance
- this matches the real risk profile of the product better than a unit-test-only strategy would

### 8.2 What are the 3 weakest points? Where would you focus improvement?

#### 1. Naming and historical drift

The biggest conceptual weakness is not that the ideas are bad. It is that the codebase and docs still carry multiple generations of the same ideas.

Examples include:
- `sprint` versus `week`
- older local-first ideas versus the newer server-authoritative model
- multiple names for related planning and review document concepts
- deployment structure that is partly legacy and partly modularized

Where I would focus improvement:
- pick one canonical naming scheme and finish the rename
- identify which docs are historical and clearly mark or archive them
- keep one “current architecture” source of truth aggressively up to date

#### 2. The unified model raises the cost of inconsistency

The unified document model buys consistency and speed, but it only stays elegant if the conventions stay tight.

Why this is a weak point:
- a lot of product behavior depends on conventions rather than hard database separation
- JSON properties are flexible, but they also make it easier for soft-schema drift to accumulate
- if engineers stop being disciplined, the model becomes ambiguous and harder to reason about

Where I would focus improvement:
- stronger typed accessors around document properties
- stricter runtime validation at API boundaries
- clearer invariants around which relationships belong in columns, which belong in associations, and which belong in properties
- more explicit domain helpers so individual routes do not reinterpret the model in slightly different ways

#### 3. Deployment and release flow are automated, but not truly unified

There is real deployment automation, but the operational model is still more manual and fragmented than it should be.

Why this is weak:
- there is no in-repo CI/CD pipeline configuration
- API deploy, frontend deploy, and infrastructure deploy are split across shell scripts
- `prod` is still treated differently from `dev` and `shadow`
- getting to a repeatable clean release takes more operator knowledge than it should

Where I would focus improvement:
- unify the environment strategy so `prod`, `dev`, and `shadow` follow the same conceptual path
- create one authoritative release flow
- make test, build, and deploy prerequisites more machine-enforced and less tribal
- add a real pipeline once the release flow stabilizes

### 8.3 If you had to onboard a new engineer to this codebase, what would you tell them first?

I would tell them this first:
- Ship is a government-oriented, Jira-like planning and execution system.
- The core philosophy is that everything is a document.
- TypeScript is what makes that philosophy practical.
- If you do not understand the document model, the rest of the codebase will look more complicated than it actually is.

Then I would tell them the practical version:
1. Learn `web/`, `api/`, and `shared/` as one system, not three separate apps.
2. Start with the document model and document relationships before reading feature routes.
3. Understand that older code and docs may say `sprint` where the product intent now means `week`.
4. Treat the editor and collaboration layer as platform infrastructure.
5. Do not assume a feature is standalone. In Ship, planning, execution, review, and accountability are intentionally connected.
6. When in doubt, look for the shared type first. The shared type usually tells you what the system thinks the concept is.

### 8.4 What would break first if this app had 10x more users?

The first thing I would expect to hurt is the API, database, and collaboration boundary, not the static frontend.

More specifically, the first real pressure point would probably be:
- on-demand document graph queries and computed rollups or status views hitting Postgres harder and harder
- combined with more simultaneous collaboration rooms and WebSocket fan-out on the API tier

Why I think that breaks first:
- the frontend is static assets behind CloudFront, so that part scales relatively well
- Aurora and Elastic Beanstalk can scale, but the application model still concentrates a lot of read and write complexity in the document graph
- week and accountability views, project and program rollups, document associations, and collaboration persistence all stack load on the same backend and database surface area
- real-time editing adds memory and connection pressure that ordinary CRUD apps do not have

If I had to prioritize 10x-readiness work, I would focus here first:
1. query profiling and index review around `documents`, `document_associations`, and week, program, and project rollups
2. identifying which computed views need caching, precomputation, or materialization
3. stress-testing collaboration fan-out and room lifecycle under horizontal scaling
4. separating genuinely hot paths from the rest of the generic document machinery

## Final Synthesis

The strongest part of this codebase is that it actually has a point of view.

It is not trying to be a generic task app. It is trying to be a government-oriented planning and execution system where everything is a document, and where planning, execution, review, and accountability all sit on the same foundation.

That is the right kind of ambition.

The cost is that this architecture only stays good if the team stays disciplined. Once naming drifts, conventions blur, and deployment paths fork, the elegance starts leaking away.

So the highest-level assessment is:
- the core architectural bets are good
- the repo already shows the right system shape
- the next phase of maturity is not inventing new ideas
- it is tightening, unifying, and operationalizing the ones that are already here
