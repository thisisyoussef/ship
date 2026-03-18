/**
 * approval_interrupt - Shared Pipeline (HITL Gate)
 *
 * Lane: Shared
 * Type: LangGraph interrupt() - pauses execution
 * LLM: No
 *
 * Builds a PendingApproval object and uses LangGraph's interrupt()
 * to pause execution until the user approves, dismisses, or snoozes.
 *
 * Resume behavior:
 * - approved → execute_confirmed_action
 * - dismissed → persist_action_outcome
 * - snoozed → persist_action_outcome (with snooze metadata)
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import { interrupt } from '@langchain/langgraph'

import type { PendingApproval, TraceMetadata } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Interrupts execution for human-in-the-loop approval.
 *
 * This node uses LangGraph's interrupt() to pause the graph and
 * wait for user input. The graph will resume with the user's decision.
 *
 * @param state - Current graph state with proposed actions
 * @returns State update with pending approval
 */
export function approvalInterrupt(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  // Get the first action requiring approval
  const actionToApprove = state.proposedActions.find((a) => a.requiresApproval)

  if (!actionToApprove) {
    // No action requires approval - shouldn't reach here but handle gracefully
    return {
      path: ['approval_interrupt'],
      branch: 'advisory',
    }
  }

  // Find the corresponding reasoned finding
  const finding = state.reasonedFindings?.find(
    (f) => f.fingerprint === actionToApprove.findingFingerprint
  )

  if (!finding) {
    return {
      path: ['approval_interrupt'],
      branch: 'fallback',
      fallbackReason: 'No finding found for action requiring approval',
    }
  }

  // Build pending approval
  const pendingApproval: PendingApproval = {
    id: `approval:${finding.fingerprint}:${Date.now()}`,
    proposedAction: actionToApprove,
    reasonedFinding: finding,
    createdAt: new Date().toISOString(),
  }

  // Update trace metadata
  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    branch: 'action_required',
    approvalRequired: true,
  }

  // Interrupt execution and wait for user decision
  // The interrupt value will be displayed to the user
  const interruptValue = {
    type: 'approval_request',
    id: pendingApproval.id,
    title: finding.title,
    summary: finding.explanation,
    action: {
      label: actionToApprove.label,
      endpoint: actionToApprove.endpoint,
      safetyRationale: actionToApprove.safetyRationale,
    },
    targetEntity: finding.targetEntity,
    options: {
      apply: { label: 'Apply', description: `${actionToApprove.label}` },
      dismiss: { label: 'Dismiss', description: 'Hide this finding with cooldown' },
      snooze: { label: 'Snooze', description: 'Hide for 4 hours' },
    },
  }

  // Use LangGraph's interrupt() to pause execution
  interrupt(interruptValue)

  // This return is used when the graph resumes
  return {
    pendingApproval,
    traceMetadata,
    path: ['approval_interrupt'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type ApprovalInterruptRoute =
  | 'execute_confirmed_action'
  | 'persist_action_outcome'

/**
 * Routes based on the user's approval decision.
 */
export function routeFromApprovalInterrupt(
  state: FleetGraphStateV2
): ApprovalInterruptRoute {
  if (state.approvalDecision === 'approved') {
    return 'execute_confirmed_action'
  }
  // dismissed or snoozed
  return 'persist_action_outcome'
}
