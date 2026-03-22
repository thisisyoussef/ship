// ──────────────────────────────────────────────────────────────────────────────
// Fixed UUIDs for demo documents — these IDs trigger hardcoded FleetGraph responses
// ──────────────────────────────────────────────────────────────────────────────

export const DEMO_IDS = {
  // Project
  DEMO_PROJECT: 'f1000000-0000-0000-0000-000000000001',
  // Program
  DEMO_PROGRAM: 'f1000000-0000-0000-0000-000000000000',
  // Sprints
  WEEK_START_DRIFT: 'f1000000-0000-0000-0000-000000000010',
  EMPTY_ACTIVE_WEEK: 'f1000000-0000-0000-0000-000000000020',
  SPRINT_NO_OWNER: 'f1000000-0000-0000-0000-000000000030',
  UNASSIGNED_ISSUES: 'f1000000-0000-0000-0000-000000000040',
  APPROVAL_GAP: 'f1000000-0000-0000-0000-000000000050',
  // Project (for deadline risk)
  DEADLINE_RISK_PROJECT: 'f1000000-0000-0000-0000-000000000060',
  // Issues
  BLOCKER_AGING_ISSUE: 'f1000000-0000-0000-0000-000000000070',
  UNASSIGNED_ISSUE_1: 'f1000000-0000-0000-0000-000000000041',
  UNASSIGNED_ISSUE_2: 'f1000000-0000-0000-0000-000000000042',
  UNASSIGNED_ISSUE_3: 'f1000000-0000-0000-0000-000000000043',
  UNASSIGNED_ISSUE_4: 'f1000000-0000-0000-0000-000000000044',
} as const

export const ALL_DEMO_DOC_IDS = new Set(Object.values(DEMO_IDS))

// ──────────────────────────────────────────────────────────────────────────────
// Title constants
// ──────────────────────────────────────────────────────────────────────────────

export const FLEETGRAPH_DEMO_PROJECT_TITLE = 'FleetGraph Demo Project'
export const FLEETGRAPH_DEMO_WEEK_TITLE = 'FleetGraph Demo Week - Review and Apply'
export const FLEETGRAPH_DEMO_WORKER_WEEK_TITLE = 'FleetGraph Demo Week - Worker Generated'
export const FLEETGRAPH_DEMO_FINDING_SUMMARY = 'This demo week is still in planning even though its start window has passed.'
export const FLEETGRAPH_DEMO_THREAD_PREFIX = 'fleetgraph:demo-proof'
export const FLEETGRAPH_DEMO_WORKER_FINDING_TITLE = `Week start drift: ${FLEETGRAPH_DEMO_WORKER_WEEK_TITLE}`

// Comprehensive demo week titles
export const FLEETGRAPH_DEMO_WEEK_ACTIVE_TITLE = 'FleetGraph Demo Week - Active with Issues'
export const FLEETGRAPH_DEMO_WEEK_UNASSIGNED_TITLE = 'FleetGraph Demo Week - Unassigned Issues'
export const FLEETGRAPH_DEMO_WEEK_NO_OWNER_TITLE = 'FleetGraph Demo Week - No Owner'
export const FLEETGRAPH_DEMO_WEEK_PLAN_SUBMITTED_TITLE = 'FleetGraph Demo Week - Plan Needs Approval'
