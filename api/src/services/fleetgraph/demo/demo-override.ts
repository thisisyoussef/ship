/**
 * FleetGraph Demo Override
 *
 * When a document has a fixed demo UUID, this module returns hardcoded
 * FleetGraph state so the entry service can short-circuit the normal runtime.
 * This keeps the demo deterministic without touching production code paths.
 *
 * The 3 demo sprints produce multiple findings simultaneously to showcase
 * the proactive pipeline's ability to surface several issues at once.
 */

import { DEMO_IDS, ALL_DEMO_DOC_IDS } from './constants.js'
import type { FleetGraphBranch, FleetGraphOutcome } from '../graph/types.js'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface DemoOverrideState {
  branch: FleetGraphBranch
  outcome: FleetGraphOutcome
  path: string[]
  routeSurface: string
  threadId: string
}

export interface DemoScenarioResult {
  branch: FleetGraphBranch
  evidence: string[]
  findingType: string
  summary: string
  title: string
}

export interface DemoOverrideResult {
  state: DemoOverrideState
  scenarioResults: DemoScenarioResult[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Reusable finding builders
// ──────────────────────────────────────────────────────────────────────────────

function weekStartDriftFinding(): DemoScenarioResult {
  return {
    branch: 'reasoned',
    evidence: [
      'Sprint status is "planning" but the start date has passed.',
      'The sprint started approximately 48 hours ago.',
      'Starting the week would unblock issue tracking and standups.',
    ],
    findingType: 'week_start_drift',
    summary: 'This week is still in planning even though its start window has passed. Starting it would unblock issue tracking and standup submission.',
    title: 'Week is still in planning',
  }
}

function sprintNoOwnerFinding(): DemoScenarioResult {
  return {
    branch: 'approval_required',
    evidence: [
      'Sprint has no owner_id assigned.',
      'Without an owner, nobody is accountable for driving execution.',
      'Assigning an owner ensures daily standups and progress tracking.',
    ],
    findingType: 'sprint_no_owner',
    summary: 'This week has no owner assigned, so nobody is accountable for driving execution and daily standups.',
    title: 'Week has no owner',
  }
}

function approvalGapFinding(): DemoScenarioResult {
  return {
    branch: 'approval_required',
    evidence: [
      'Week plan was submitted 3 business days ago.',
      'The owner may be blocked waiting for approval.',
      'Reviewing and approving unblocks the next planning cycle.',
    ],
    findingType: 'approval_gap',
    summary: 'This week plan has been waiting 3 business days for approval, so the owner may be blocked on the next step.',
    title: 'Week plan needs review',
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Scenario Builders (one per demo sprint)
// ──────────────────────────────────────────────────────────────────────────────

/** Sprint 1: all three findings at once */
function buildAllThreeDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'approval_required',
      path: ['demo_override', 'all_three'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [
      weekStartDriftFinding(),
      sprintNoOwnerFinding(),
      approvalGapFinding(),
    ],
  }
}

/** Sprint 2: week start drift + no owner */
function buildDriftNoOwnerDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'approval_required',
      path: ['demo_override', 'drift_no_owner'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [
      weekStartDriftFinding(),
      sprintNoOwnerFinding(),
    ],
  }
}

/** Sprint 3: approval gap only */
function buildApprovalOnlyDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'approval_required',
      path: ['demo_override', 'approval_only'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [
      approvalGapFinding(),
    ],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * If `documentId` is a known demo UUID, returns a hardcoded FleetGraph state
 * that the entry service can use to short-circuit the runtime. Returns `null`
 * for non-demo documents so the normal pipeline runs.
 */
export function getDemoOverrideResponse(
  documentId: string,
  _documentType: string,
  threadId: string
): DemoOverrideResult | null {
  if (!(ALL_DEMO_DOC_IDS as Set<string>).has(documentId)) return null

  let result: DemoOverrideResult | null = null

  switch (documentId) {
    case DEMO_IDS.SPRINT_ALL_THREE:
      result = buildAllThreeDemo()
      break
    case DEMO_IDS.SPRINT_DRIFT_NO_OWNER:
      result = buildDriftNoOwnerDemo()
      break
    case DEMO_IDS.SPRINT_APPROVAL_ONLY:
      result = buildApprovalOnlyDemo()
      break
    default:
      return null
  }

  // Stamp the threadId so the entry service can use it
  result.state.threadId = threadId
  return result
}
