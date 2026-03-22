// ──────────────────────────────────────────────────────────────────────────────
// Fixed UUIDs for demo documents — these IDs produce proactive findings
// ──────────────────────────────────────────────────────────────────────────────

export const DEMO_IDS = {
  // Shared containers
  DEMO_PROGRAM: 'f1000000-0000-0000-0000-000000000000',
  DEMO_PROJECT: 'f1000000-0000-0000-0000-000000000001',

  // Sprint 1: triggers week_start_drift + sprint_no_owner + approval_gap
  // (planning, past start, no owner, plan submitted 3 days ago)
  SPRINT_ALL_THREE: 'f1000000-0000-0000-0000-000000000010',

  // Sprint 2: triggers week_start_drift + sprint_no_owner
  // (planning, past start, no owner)
  SPRINT_DRIFT_NO_OWNER: 'f1000000-0000-0000-0000-000000000020',

  // Sprint 3: triggers approval_gap only
  // (planning, has owner, plan submitted 3 days ago)
  SPRINT_APPROVAL_ONLY: 'f1000000-0000-0000-0000-000000000030',
} as const

export const ALL_DEMO_DOC_IDS = new Set(Object.values(DEMO_IDS))

// ──────────────────────────────────────────────────────────────────────────────
// Title constants (kept for backward compat with fixture.ts)
// ──────────────────────────────────────────────────────────────────────────────

export const FLEETGRAPH_DEMO_PROJECT_TITLE = 'FleetGraph Demo Project'
export const FLEETGRAPH_DEMO_WEEK_TITLE = 'FleetGraph Demo Week - Review and Apply'
export const FLEETGRAPH_DEMO_WORKER_WEEK_TITLE = 'FleetGraph Demo Week - Worker Generated'
export const FLEETGRAPH_DEMO_FINDING_SUMMARY = 'This demo week is still in planning even though its start window has passed.'
export const FLEETGRAPH_DEMO_THREAD_PREFIX = 'fleetgraph:demo-proof'
export const FLEETGRAPH_DEMO_WORKER_FINDING_TITLE = `Week start drift: ${FLEETGRAPH_DEMO_WORKER_WEEK_TITLE}`
