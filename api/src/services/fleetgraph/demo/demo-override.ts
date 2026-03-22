/**
 * FleetGraph Demo Override
 *
 * When a document has a fixed demo UUID, this module returns a hardcoded
 * FleetGraph state so the entry service can short-circuit the normal runtime.
 * This keeps the demo deterministic without touching production code paths.
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
// Scenario Builders
// ──────────────────────────────────────────────────────────────────────────────

function buildWeekStartDriftDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'advisory',
      path: ['demo_override', 'week_start_drift'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [{
      branch: 'reasoned',
      evidence: [
        'Sprint status is "planning" but the start date has passed.',
        'The sprint started approximately 48 hours ago.',
        'Starting the week would unblock issue tracking and standups.',
      ],
      findingType: 'week_start_drift',
      summary: 'FleetGraph detected: This week is still in planning even though its start window has passed. Starting it would unblock issue tracking and standup submission. Suggested action: Start this week.',
      title: 'Week start drift detected',
    }],
  }
}

function buildEmptyActiveWeekDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'advisory',
      path: ['demo_override', 'empty_active_week'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [{
      branch: 'reasoned',
      evidence: [
        'Sprint status is "active" but issue count is 0.',
        'An active week with no issues gives the team nothing concrete to execute against.',
        'Consider scoping issues before the end of the week.',
      ],
      findingType: 'empty_active_week',
      summary: 'FleetGraph detected: This active week has no scoped issues. The team may not have a concrete plan to execute against.',
      title: 'Active week has no issues',
    }],
  }
}

function buildSprintNoOwnerDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'approval_required',
      path: ['demo_override', 'sprint_no_owner'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [{
      branch: 'approval_required',
      evidence: [
        'Sprint has no owner_id assigned.',
        'Without an owner, nobody is accountable for driving execution.',
        'Assigning an owner ensures daily standups and progress tracking.',
      ],
      findingType: 'sprint_no_owner',
      summary: 'FleetGraph detected: This week has no owner assigned, so nobody is accountable for driving execution and daily standups. Suggested action: Assign an owner.',
      title: 'Week has no owner',
    }],
  }
}

function buildUnassignedIssuesDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'approval_required',
      path: ['demo_override', 'unassigned_sprint_issues'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [{
      branch: 'approval_required',
      evidence: [
        '4 of 4 issues in this week have no assignee.',
        'Sprint is active, so unassigned work may slip.',
        'Assigning issues helps the team stay focused and accountable.',
      ],
      findingType: 'unassigned_sprint_issues',
      summary: 'FleetGraph detected: 4 unassigned issues in this active week. Assigning issues helps the team stay focused and accountable. Suggested action: Assign issues.',
      title: '4 unassigned issues in active week',
    }],
  }
}

function buildApprovalGapDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'approval_required',
      path: ['demo_override', 'approval_gap'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [{
      branch: 'approval_required',
      evidence: [
        'Week plan was submitted 2+ business days ago.',
        'The owner may be blocked waiting for approval.',
        'Reviewing and approving unblocks the next planning cycle.',
      ],
      findingType: 'approval_gap',
      summary: 'FleetGraph detected: This week plan has been waiting 2+ business days for approval, so the owner may be blocked on the next step. Suggested action: Review and approve.',
      title: 'Week plan needs review',
    }],
  }
}

function buildDeadlineRiskDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'advisory',
      path: ['demo_override', 'deadline_risk'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [{
      branch: 'reasoned',
      evidence: [
        'Project target date is 3 days away.',
        'There are still open issues that need resolution.',
        'At least one high-priority issue has not been updated recently.',
      ],
      findingType: 'deadline_risk',
      summary: 'FleetGraph detected: Project deadline is at risk. The target date is 3 days away with open issues remaining. Suggested action: Escalate risk.',
      title: 'Project deadline at risk',
    }],
  }
}

function buildBlockerAgingDemo(): DemoOverrideResult {
  return {
    state: {
      branch: 'reasoned',
      outcome: 'advisory',
      path: ['demo_override', 'blocker_aging'],
      routeSurface: 'document-detail',
      threadId: '',
    },
    scenarioResults: [{
      branch: 'reasoned',
      evidence: [
        'Issue has been in "blocked" state for 5+ days.',
        'No meaningful update has been posted during that period.',
        'The issue may need escalation or reassignment.',
      ],
      findingType: 'blocker_aging',
      summary: 'FleetGraph detected: This issue has an aging blocker. The blocker has gone 5 business days without a meaningful update. Suggested action: Post a comment to escalate.',
      title: 'Issue has an aging blocker',
    }],
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
    case DEMO_IDS.WEEK_START_DRIFT:
      result = buildWeekStartDriftDemo()
      break
    case DEMO_IDS.EMPTY_ACTIVE_WEEK:
      result = buildEmptyActiveWeekDemo()
      break
    case DEMO_IDS.SPRINT_NO_OWNER:
      result = buildSprintNoOwnerDemo()
      break
    case DEMO_IDS.UNASSIGNED_ISSUES:
      result = buildUnassignedIssuesDemo()
      break
    case DEMO_IDS.APPROVAL_GAP:
      result = buildApprovalGapDemo()
      break
    case DEMO_IDS.DEADLINE_RISK_PROJECT:
      result = buildDeadlineRiskDemo()
      break
    case DEMO_IDS.BLOCKER_AGING_ISSUE:
      result = buildBlockerAgingDemo()
      break
    default:
      return null
  }

  // Stamp the threadId so the entry service can use it
  result.state.threadId = threadId
  return result
}
