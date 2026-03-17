# Anti-Patterns

Capture failures so they are not repeated.

## Anti-Pattern Template
- **Problem**:
- **Example**:
- **Why it failed**:
- **Prevention rule**:

## Seeded Anti-Patterns
- **Problem**: Vibe-based AI verification
- **Example**: Shipping prompt, routing, or retrieval changes because a few manual spot checks "looked good."
- **Why it failed**: Nondeterministic failures, edge-case regressions, and judge bias go unnoticed until production.
- **Prevention rule**: Use task-specific evals with representative slices, explicit thresholds, and human calibration when automated grading is involved.

- **Problem**: Vague frontend taste prompting
- **Example**: Asking the agent to make the UI "clean", "modern", or "pretty" without naming typography, composition, or color constraints.
- **Why it failed**: The model collapses toward generic, crowded, statistically average web output.
- **Prevention rule**: For UI scope, define one strong visual direction and translate it into concrete type, whitespace, layout, color, depth, and motion rules.

- **Problem**: One-line UI prompting for strategic design work
- **Example**: "Design a landing page" with no role, context, constraints, output structure, or revision loop.
- **Why it failed**: The model fills in missing context with defaults, causing generic output and extra rework.
- **Prevention rule**: Use WIRE for most UI tasks and extend to WIRE+FRAME when the work is strategic, reusable, or multi-step.

- **Problem**: Inheriting the source project stack into the template
- **Example**: Shipping a generic workspace with Python/RAG/provider-specific commands, paths, and specialist agents baked into the default contract.
- **Why it failed**: New projects begin with the wrong assumptions and have to undo template bias before real work starts.
- **Prevention rule**: Keep the template stack-neutral and force stack selection during setup.

- **Problem**: Assuming canonical associations are the only live relationship source
- **Example**: Building cross-project or workload features that only read `document_associations` and ignore active legacy reads of `properties.project_id` and `assignee_ids`.
- **Why it failed**: Ship still has runtime paths that depend on the legacy fields, so features silently miss assignments, project context, or approval targets.
- **Prevention rule**: Normalize both canonical and legacy relationship signals at the FleetGraph boundary before reasoning.

- **Problem**: Treating `/events` as a durable agent trigger bus
- **Example**: Designing proactive FleetGraph around subscribing to the existing WebSocket events layer as if it were a replayable queue.
- **Why it failed**: The current realtime layer is browser-facing delivery plumbing with no persistence, no replay, and no worker-consumable event contract.
- **Prevention rule**: Use route-level enqueue hooks plus scheduled sweeps for triggering, and reserve `/events` for delivery only.

- **Problem**: Starting FleetGraph use-case implementation before the platform substrate exists
- **Example**: Building stale-issue detection or contextual chat behavior before tracing, graph state, provider abstraction, worker scheduling, and deployment/auth contracts are defined.
- **Why it failed**: The first feature ends up choosing hidden architecture decisions for every later story, usually with weak observability and brittle deployment assumptions.
- **Prevention rule**: Start FleetGraph with a foundation phase that locks the runtime, tracing, worker, and deployment contracts first.

- **Problem**: Treating the source PRD's Claude bullet as the live repo contract
- **Example**: Wiring FleetGraph directly to Claude because the PDF says so, even after the active repo direction changed.
- **Why it failed**: It locks the runtime to a stale assignment interpretation and blocks the preferred OpenAI path before the adapter boundary exists.
- **Prevention rule**: Use the checked-in PDF for assignment intent, but let the live repo docs define the current provider direction.

- **Problem**: Turning a narrow user correction into a broad replanning exercise
- **Example**: The user says to ignore one stale requirement bullet, and the response grows into new ADRs, new phase packs, and expanded architectural scope without first classifying impact.
- **Why it failed**: It creates work the user did not ask for, obscures the real correction, and weakens trust in the workflow's proportionality.
- **Prevention rule**: Run user-correction triage first and keep low-blast-radius fixes bounded to the smallest affected surfaces.

- **Problem**: Flat docs sprawl
- **Example**: Keeping active product references, assignment deliverables, screenshots, PR artifacts, and archived submissions side by side in the same top-level docs surface.
- **Why it failed**: Humans and agents both lose the distinction between current guidance and supporting or historical material.
- **Prevention rule**: Group docs by reader intent and lifecycle, and keep archive/evidence areas explicitly labeled.

- **Problem**: Cargo-culting substrate from sibling repos
- **Example**: Copying a neighboring repo's Claude wiring, Vercel serverless runtime, GitHub Actions worker, or Celery queue stack directly into FleetGraph because it already exists nearby.
- **Why it failed**: The copied implementation solves a different product/runtime problem and drags in the wrong provider, hosting, or execution assumptions.
- **Prevention rule**: Reuse neighboring repos at the contract level only and record explicit keep/avoid decisions before implementation.

- **Problem**: Letting graph nodes choose their provider directly
- **Example**: Future FleetGraph nodes read env vars or import SDK-specific clients directly to decide between OpenAI and Bedrock at call time.
- **Why it failed**: Provider choice leaks into node logic, makes tracing/bootstrap harder to centralize, and turns a provider switch into a graph refactor.
- **Prevention rule**: Keep provider selection in the FleetGraph adapter factory and expose only the `LLMAdapter` contract to the rest of the runtime.

- **Problem**: Starting a new story on the previous story's branch
- **Example**: T002 implementation continued on `codex/fleetgraph-t001-recon` because the branch rollover step was implicit instead of enforced.
- **Why it failed**: The branch name stopped reflecting the active work, story tracking became confusing, and finalization evidence would have been harder to trust.
- **Prevention rule**: Sync remotes, create a fresh `codex/` branch for each new story, and record the branch transition in handoff.

- **Problem**: Guessing the deploy target from stray repo artifacts
- **Example**: Treating `render.yaml` or neighboring repo defaults as the product deployment contract even though Ship's live runtime is AWS-native.
- **Why it failed**: The wrong release surface gets reviewed, and operational changes can ship without checking the actual backend/frontend deployment path.
- **Prevention rule**: Use `.claude/CLAUDE.md`, `README.md`, and `docs/core/application-architecture.md` as the deployment source of truth and review deploy impact on every story.

- **Problem**: Writing a story pack one story at a time without pack objectives
- **Example**: Drafting T001, then inventing T002-T008 incrementally without first defining the whole pack's higher-level outcomes and cohesion.
- **Why it failed**: The pack can become uneven, overlapping, and harder to reason about as a system rather than a list of isolated stories.
- **Prevention rule**: Define pack-level objectives first and write the full planned story set in one planning pass before implementation.

- **Problem**: Leaving deployment state implied
- **Example**: A story changes runtime code and the handoff says only that deployment was reviewed, leaving everyone to guess whether the change is actually live.
- **Why it failed**: Teams confuse deploy-readiness with deployed state, and missing credentials or manual steps stay hidden.
- **Prevention rule**: Always record deployment execution status explicitly as `deployed`, `not deployed`, or `blocked`.

- **Problem**: Treating a remembered demo URL as the canonical deploy target
- **Example**: Assuming an old Render hostname is the current Ship production path even though the repo-owned deploy scripts and config point elsewhere.
- **Why it failed**: The team can deploy or verify against the wrong surface and incorrectly conclude the real product is live.
- **Prevention rule**: Only treat repo-owned config, scripts, and workflows as canonical deployment targets; classify remembered/manual demo URLs separately unless they are wired in the repo.

- **Problem**: Leaving a real demo environment outside the repo contract
- **Example**: The team actively uses `ship-demo.onrender.com`, but the repo workflows only mention AWS and treat the Render demo as a manual rumor instead of a wired deployment surface.
- **Why it failed**: Story handoffs can say "not deployed" even when a sanctioned demo path exists, and future agents may never refresh the environment users are actually looking at.
- **Prevention rule**: If a live demo environment matters to the team, give it a repo-owned deploy script and document it explicitly in the deployment workflows.

- **Problem**: Auto-sharing LangSmith traces whenever tracing is enabled
- **Example**: Making every FleetGraph trace public by default as soon as the API key and tracing toggle are present.
- **Why it failed**: Anyone with the shared URL can view the trace, so automatic public sharing turns normal observability into accidental data exposure.
- **Prevention rule**: Keep tracing enablement separate from public sharing and require an explicit FleetGraph share flag before creating public LangSmith links.

- **Problem**: Letting branch taxonomy drift across presearch, traces, and runtime code
- **Example**: Presearch talks about `quiet_exit` and `approval_interrupt`, tracing records `branch:quiet`, and runtime nodes improvise different names or state fields for the same path.
- **Why it failed**: Tests, traces, and future graph stories stop lining up, which makes checkpoint history harder to interpret and encourages branch-local hacks.
- **Prevention rule**: Keep one explicit FleetGraph branch contract and map node names, branch labels, and outcomes through shared runtime types.

- **Problem**: Letting raw Ship route quirks leak directly into FleetGraph nodes
- **Example**: One node reads `belongs_to`, another reads `properties.project_id`, and a third assumes the frontend already derived the active tab or breadcrumb context.
- **Why it failed**: The graph becomes coupled to route-specific payload accidents instead of one internal model, making worker and UI entry behavior drift apart.
- **Prevention rule**: Normalize mixed REST payloads and route context once into `NormalizedShipDocument` and `ShipContextEnvelope` before graph logic runs.

- **Problem**: Replaying historical migrations on top of the current schema snapshot
- **Example**: Applying `schema.sql` for a fresh database and then rerunning old enum-rename migrations like the sprint-to-week rename, even though the schema file already reflects the renamed values.
- **Why it failed**: Fresh installs hit impossible duplicate or missing-enum transitions, which breaks local bootstrap and DB-backed tests before story code even runs.
- **Prevention rule**: Treat `schema.sql` as the fresh-install snapshot, mark historical migrations as applied on empty databases, and only execute pending migrations for already-migrated environments.

- **Problem**: Building FleetGraph entry directly from raw router state or direct DB reads
- **Example**: A page-specific FleetGraph widget reads `useParams()` and document fields ad hoc, or the backend jumps straight to the database to reconstruct context, instead of going through the normalized page-context contract.
- **Why it failed**: Context drift appears between the page shell, the API route, and the graph runtime, which makes approval behavior and thread lineage inconsistent.
- **Prevention rule**: Always build on-demand entry through the normalized page-context payload and `/api/fleetgraph/entry`, with the backend deriving the final trigger envelope and `thread_id`.

- **Problem**: Multiple full orchestrators competing as startup source of truth
- **Example**: `AGENTS.md`, `.ai/agents/claude.md`, and `.ai/codex.md` each restate the same gates, routing, validation commands, and handoff prose with slightly different emphasis.
- **Why it failed**: Startup token load grows, canonical ownership gets ambiguous, and trimming one file becomes risky because the others may silently drift.
- **Prevention rule**: Keep one canonical orchestrator and make the other agent entrypoints thin compatibility mirrors that defer to it.

- **Problem**: Full ceremony on truly trivial stories
- **Example**: A one-file mechanical fix still has to walk through spec-driven delivery, eval design, and flight coordination even though none of those gates reduce real risk for the change.
- **Why it failed**: The harness makes quick fixes feel disproportionately expensive, which encourages people to bypass the process entirely.
- **Prevention rule**: Run story lookup first, then use `.ai/workflows/story-sizing.md` to route only one-file, non-API, non-AI stories into the trivial lane.

- **Problem**: Manual-only AI wiring checks
- **Example**: `check_ai_wiring.sh` runs only when someone remembers to invoke it after editing the harness.
- **Why it failed**: Wiring drift can land on a branch and survive until review because the guard was optional in practice.
- **Prevention rule**: Let the pre-commit hook and `scripts/git_finalize_guard.sh` call `check_ai_wiring.sh` automatically for AI-architecture diffs.

- **Problem**: Unbounded correction patch loops
- **Example**: The same story cycles through user correction triage again and again without ever escalating that the story itself may be mis-scoped.
- **Why it failed**: Repeated local patches hide structural problems in the spec or the chosen approach.
- **Prevention rule**: Persist triage counts per story and trip a re-scope circuit breaker once the limit is reached.

- **Problem**: Single-agent TDD context contamination
- **Example**: The same agent writes tests, writes the implementation, and then declares refactor done inside one context window.
- **Why it failed**: The red phase becomes shallow, tests mirror the intended implementation too closely, and edge cases that would break a naive solution are underrepresented.
- **Prevention rule**: Use the file-isolated three-agent TDD pipeline with RED/GREEN guards, fixed-test ownership, and explicit escalation limits.

- **Problem**: Divergent FleetGraph env contracts across API and worker
- **Example**: The API surface reads one set of provider/tracing/service-auth variables while the worker CLI expects a different or partially implicit set, and deploy smoke relies only on `/health`.
- **Why it failed**: One FleetGraph surface can look alive while the other is misconfigured, and the team ends up “verifying” deploys without a real service-auth or trace proof path.
- **Prevention rule**: Resolve API and worker readiness from the same FleetGraph deployment module, expose a token-protected readiness route, and require trace evidence alongside deploy smoke.

- **Problem**: Treating optional AWS secret-store lookups as mandatory on non-AWS hosts
- **Example**: A Render deploy with explicit runtime env still crashes during boot because optional FleetGraph or LangSmith SSM reads throw `CredentialsProviderError` before readiness can be evaluated.
- **Why it failed**: The host is not meant to have AWS credentials, so an optional fallback path becomes a hard availability dependency and hides the real configuration state.
- **Prevention rule**: Use explicit runtime env as the primary config source on non-AWS hosts and make optional secret-store fallbacks credential-tolerant so readiness can report the true missing settings.

- **Problem**: Reading Ship product data directly from FleetGraph tables or the Ship database for proactive scoring
- **Example**: Building week-start drift by selecting Ship weeks or projects from SQL because the worker already has database access for its own queue and findings tables.
- **Why it failed**: It breaks the assignment constraint that Ship REST is the data source and blurs the ownership boundary between Ship product state and FleetGraph-owned state.
- **Prevention rule**: Fetch Ship product context through Ship REST only; reserve database writes and reads for FleetGraph-owned queue, checkpoint, and proactive finding state.

- **Problem**: Backend-first MVP stories with late or missing visible proof
- **Example**: Finishing worker/runtime logic and only then thinking about which Ship surface the user can inspect, leaving no practical way to monitor behavior from the live demo during development.
- **Why it failed**: The user loses visibility into progress, audits become code-only, and product behavior is harder to validate before the final evidence story.
- **Prevention rule**: For visible behavior stories, establish or extend the UI proof lane early and require explicit UI inspection steps in the completion gate.

- **Problem**: Executing FleetGraph-approved Ship writes by jumping straight to Ship database logic
- **Example**: Reusing internal week-start SQL/update helpers from FleetGraph because they are already in the same API process, instead of forwarding the approved action through `/api/weeks/:id/start`.
- **Why it failed**: It bypasses the assignment’s REST boundary, makes FleetGraph harder to reason about as a same-origin client of Ship, and quietly expands its write surface beyond the documented API contract.
- **Prevention rule**: Even for in-process apply flows, route real Ship mutations through the existing Ship REST endpoint and keep FleetGraph persistence limited to its own findings, queue, checkpoint, and action-execution records.

- **Problem**: Depending on incidental workspace data for public-demo UI proof
- **Example**: Asking reviewers to open any project or sprint page and hope a proactive finding happens to be visible there after the latest deploy.
- **Why it failed**: UI audits become ambiguous, regressions look like missing data instead of missing behavior, and future stories have no stable visual baseline to extend.
- **Prevention rule**: Seed and document one named FleetGraph demo proof lane, then keep that exact page and finding title usable across future stories.

- **Problem**: Letting primary UI surfaces lead with technical diagnostics
- **Example**: Showing endpoint paths, route names, thread ids, or transport phrasing in the main user-facing card instead of behind optional debug disclosure.
- **Why it failed**: Users lose the main task narrative, copy feels colder and more technical than necessary, and debugging detail competes with trust-building status language.
- **Prevention rule**: Keep primary copy in user language, keep success/failure messaging tied to confirmed outcomes, and demote diagnostics into progressive disclosure or a secondary debug surface.

- **Problem**: Fragmenting debug detail inside each FleetGraph card
- **Example**: Each proactive or entry card grows its own inline `Debug details` block, so QA has to open multiple spots and the main card layout stays visually noisy even after copy cleanup.
- **Why it failed**: Secondary diagnostic language keeps leaking into the primary surface and technical QA becomes scattered instead of inspectable in one place.
- **Prevention rule**: Consolidate technical FleetGraph detail into one page-level secondary dock when the page contains multiple related FleetGraph surfaces.

- **Problem**: Letting the sanctioned public demo depend on provider-side predeploy magic
- **Example**: Treating a hosted demo as reliable even though migrations or seed/bootstrap depend on free-plan hooks, blocked DB access, or manual dashboard steps outside the repo.
- **Why it failed**: The live demo can look healthy while FleetGraph routes or tables are broken, and story finalization drifts away from what users are actually seeing.
- **Prevention rule**: Keep the public demo on a repo-owned deploy path that runs the boot sequence you control and verify behavior beyond `/health`.

- **Problem**: Treating mocked Ship route shapes as stricter than the live API
- **Example**: FleetGraph accepts a hand-written `/api/weeks` test fixture but rejects the real Ship response because the live payload includes extra fields and exposes the workspace sprint origin on the week rows instead of the root object.
- **Why it failed**: The worker can stay healthy yet silently fail every real-data job in production, which hides behind mocked tests until deploy time.
- **Prevention rule**: Validate proactive client schemas against the real Ship REST payload shape and normalize only the fields FleetGraph actually needs.

- **Problem**: Relying only on sweep schedules for a named public-demo worker proof lane
- **Example**: A redeploy resets the seeded HITL lane, but an old dedupe ledger or retry window prevents the worker-generated proof lane from reappearing quickly enough for a UI audit.
- **Why it failed**: The demo becomes timing-sensitive and reviewers cannot tell whether the worker is broken or just waiting on old FleetGraph-owned state.
- **Prevention rule**: For the named demo workspace, clear stale FleetGraph worker ledger state and enqueue one fresh proactive job during bootstrap so the worker-generated lane stays inspectable after each refresh.

- **Problem**: Assuming live evidence APIs already contain final share links and detailed token-cost splits
- **Example**: Treating `tracePublicUrl`, prompt/output token counts, or dollar-cost fields as guaranteed in the FleetGraph findings response and LangSmith payload, then blocking handoff when the live system only exposes run ids or total tokens.
- **Why it failed**: The deployed system can still be healthy and fully traceable, but the evidence surface needs one more promotion/query step and the current integration does not emit granular cost data.
- **Prevention rule**: Capture evidence through a repo-owned script that can share runs by id when needed, and record only the usage fields the live trace payload actually exposes.
