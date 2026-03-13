# Discovery Write-Up

This write-up captures three things I learned directly from the Ship source code while reviewing the current audit baseline. I replaced audit-report-only references with implementation-level evidence so each discovery is tied to code that actually enforces the behavior.

## 1. Cache-first CRDT sync with explicit stale-cache invalidation

### 10. Name the thing I discovered

I discovered that the editor does not simply connect Yjs to a WebSocket. It stages collaboration in two steps: local IndexedDB hydration first, then network sync, with explicit stale-cache clearing when the server says local state is no longer trustworthy.

### 11. Where I found it in the codebase

- `web/src/components/Editor.tsx`, lines 194-198
- `web/src/components/Editor.tsx`, lines 285-503

### 12. What it does and why it matters

The editor creates a fresh `Y.Doc` whenever `documentId` changes so the next document cannot inherit stale collaborative state from the previous one. It then waits briefly for `IndexeddbPersistence` to hydrate cached content before connecting `WebsocketProvider`, which gives fast local loads without skipping real-time sync. The same effect also listens for a custom cache-clear message and for close code `4101`, then wipes IndexedDB so old local content does not merge back into a freshly loaded server document.

This matters because collaborative editors fail in ugly ways when cache, live sync, and navigation are not coordinated. The code here is solving three concrete problems at once: fast navigation, offline tolerance, and protection against cross-document contamination or stale-cache merges.

### 13. How I would apply this knowledge in a future project

In a future project with collaborative editing, I would adopt the same cache-then-sync pattern instead of opening the network connection immediately. I would also include a server-driven invalidation path so local persistence can be cleared when the canonical document changes outside the editor.

## 2. Document relationships are handled through one junction-layer API, not ad hoc route SQL

### 10. Name the thing I discovered

I discovered that Ship treats document relationships as a first-class association layer with shared CRUD helpers, batching, and idempotent writes, rather than leaving each route to manage relationship SQL on its own.

### 11. Where I found it in the codebase

- `api/src/db/schema.sql`, lines 105-131
- `api/src/db/schema.sql`, lines 199-222
- `api/src/utils/document-crud.ts`, lines 107-180
- `api/src/utils/document-crud.ts`, lines 195-455

### 12. What it does and why it matters

The schema shows that Ship keeps the core `documents` table generic and stores organizational links in `document_associations`. The helper layer in `document-crud.ts` then becomes the single way to read, batch-read, sync, add, remove, and replace those links. It also bakes in two useful safeguards: `ON CONFLICT DO NOTHING` for idempotent inserts and batch association fetches to avoid N+1 query patterns when listing documents.

This matters because relationship bugs often come from split read/write paths. Here the code is pushing callers toward one shared abstraction, which makes association behavior more consistent and keeps the performance fix for list endpoints in one place instead of repeating it across route files.

### 13. How I would apply this knowledge in a future project

In a future project with movable many-to-many relationships, I would put the junction-table logic behind a small shared utility layer early. I would also ship batch lookup helpers from the start so the default path for list views is already N+1-safe.

## 3. The repo pairs schema-less storage with discriminated TypeScript document variants

### 10. Name the thing I discovered

I discovered a pattern I like a lot: keep the database flexible with one `documents` table and JSONB properties, then recover strong application-level meaning through discriminated TypeScript document variants in the shared package.

### 11. Where I found it in the codebase

- `api/src/db/schema.sql`, lines 105-131
- `shared/src/types/document.ts`, lines 222-317

### 12. What it does and why it matters

At the database level, Ship stores all document types in one table with shared `content`, `yjs_state`, and `properties` fields. In the shared TypeScript layer, that generic storage model becomes a base `Document` plus typed variants like `IssueDocument`, `ProjectDocument`, `WeekDocument`, and `WeeklyPlanDocument`, each with a fixed `document_type` discriminator and a typed `properties` shape.

This matters because it gives the product one storage and editing model without forcing the application into weakly typed branching everywhere. The database stays simple, but the frontend and API can still write code that knows an issue has `IssueProperties` and a project has `ProjectProperties`.

### 13. How I would apply this knowledge in a future project

I would use this pattern when several product entities share storage, editing, and lifecycle behavior but still need type-safe branching in code. I would keep the table generic, then put the discriminated union and typed property contracts in a shared package so both client and server narrow the same way.

## AI Cost Analysis

### Scope

The numbers below cover the measurable Codex discovery/write-up session on March 13, 2026. I measured them from the local Codex session log at:

- `/Users/youss/.codex/sessions/2026/03/13/rollout-2026-03-13T03-01-25-019ce636-e96c-7c20-9068-0a43165624c4.jsonl`

### Development Costs

- LLM API costs:
  Exact USD cost is not available from the local session log. The log exposes `model_provider: openai` and cumulative token counts, but it does not expose the billable model SKU or a per-token price table for this session.
- Total tokens consumed:
  - Input tokens: `1,629,042`
  - Cached input tokens: `1,507,200`
  - Non-cached input tokens: `121,842`
  - Output tokens: `17,744`
  - Reasoning output tokens: `7,986`
  - Total tokens: `1,646,786`
- Number of API calls made:
  At the time I captured the log, the closest measurable proxy was `19` `token_count` checkpoints. I am treating that as `19` model-response events for this write-up session, but I cannot prove from the local log that it is a billing-grade API-call count.
- Coding agent costs:
  - Coding agent used: `Codex Desktop`
  - Provider detected in session log: `OpenAI`
  - Separate subscription or seat cost for Codex Desktop: not available from the repo or local session log
  - Other coding agents used in this session: none detected

## Reflection Questions

### Which parts of the audit were AI tools most helpful for? Least helpful?

AI tools were most helpful for breadth-first discovery: finding the repo instructions, locating the final deliverable file, scanning for the editor/collaboration path, and pulling exact line references across `web/`, `api/`, and `shared/`. They were least helpful for cost accounting, because the repo does not store vendor billing data and the local session log stops short of telling me the exact dollar cost.

### Did AI tools help you understand the codebase, or did they shortcut understanding?

They helped with the first pass, but only up to a point. The useful part was the speed of source discovery. The risky part was that the existing `discovery.md` already leaned on the audit report, which would have let me repeat conclusions without confirming how the code actually worked. I had to go back to the source files to avoid that shortcut.

### Where did you have to override or correct AI suggestions? Why?

I overrode the easiest path, which was to keep the original discovery framing based on `docs/g4/audit-report.md`. That would have produced a weaker submission because the question asks for discoveries in the codebase, not just discoveries in an audit narrative. I also avoided inventing an exact OpenAI dollar cost because the local log does not expose the billable model or pricing.

### What percentage of your final code changes were AI-generated vs. hand-written?

For this session's file changes, `100%` of the text was AI-generated. The manual part was verification: choosing which findings were worth keeping, checking the cited source lines, and rejecting unsupported cost claims.

## Input I May Need From You

I can finish the repo-side deliverable without more input, but I would need your help for any cost section that must show exact dollars or cross-tool totals beyond this measured Codex session. Specifically:

- If you want an exact USD number, I need the billing export or pricing basis for the model SKU used by this session.
- If you used other AI tools during the broader project outside this Codex session, I need those tool names and their usage totals to fold them into the same table.
