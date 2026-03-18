/**
 * policy_gate - Shared Pipeline
 *
 * Lane: Shared
 * Type: Deterministic policy check
 * LLM: No
 *
 * Determines whether proposed actions are autonomous (advisory delivery)
 * or require human approval (HITL gate).
 *
 * Policy rules:
 * - No Ship mutation proposed → emit_advisory
 * - Issue reassignment/state change → approval_interrupt
 * - Week start, carryover → approval_interrupt
 * - Plan/review approval → approval_interrupt
 * - Comment posting → approval_interrupt
 * - Summary/risk note → emit_advisory (autonomous)
 * - FleetGraph-owned state (snooze, dismiss) → emit_advisory (autonomous)
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type { ProposedAction } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Policy Classification
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Determines if an action requires human approval based on its endpoint.
 */
function actionRequiresApproval(action: ProposedAction): boolean {
  // If the action itself says it requires approval, honor that
  if (action.requiresApproval) {
    return true
  }

  const { method, path } = action.endpoint
  const lowerPath = path.toLowerCase()

  // Write operations that require approval
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
    // Week mutations
    if (lowerPath.includes('/weeks/') && (
      lowerPath.includes('/start') ||
      lowerPath.includes('/carryover') ||
      lowerPath.includes('/approve') ||
      lowerPath.includes('/request-')
    )) {
      return true
    }

    // Project mutations
    if (lowerPath.includes('/projects/') && (
      lowerPath.includes('/approve') ||
      lowerPath.includes('/request-')
    )) {
      return true
    }

    // Issue mutations (POST/PATCH/DELETE already confirmed above)
    if (lowerPath.includes('/issues/')) {
      return true
    }

    // Comment posting
    if (lowerPath.includes('/comments')) {
      return true
    }

    // Bulk operations
    if (lowerPath.includes('/bulk')) {
      return true
    }
  }

  // FleetGraph-owned operations are autonomous
  if (lowerPath.includes('/fleetgraph/') && (
    lowerPath.includes('/snooze') ||
    lowerPath.includes('/dismiss')
  )) {
    return false
  }

  // Default: mutations require approval, reads don't
  return method !== 'GET'
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Applies policy rules to determine routing.
 *
 * @param state - Current graph state with proposed actions
 * @returns State update with routing decision
 */
export function policyGate(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  // Check if any proposed action requires approval
  const hasApprovalRequired = state.proposedActions.some(actionRequiresApproval)

  return {
    path: ['policy_gate'],
    // The branch was already set by score_candidates, but we verify here
    branch: hasApprovalRequired ? 'action_required' : state.branch,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type PolicyGateRoute = 'emit_advisory' | 'approval_interrupt'

/**
 * Routes based on whether any action requires approval.
 */
export function routeFromPolicyGate(
  state: FleetGraphStateV2
): PolicyGateRoute {
  const hasApprovalRequired = state.proposedActions.some(actionRequiresApproval)
  return hasApprovalRequired ? 'approval_interrupt' : 'emit_advisory'
}
