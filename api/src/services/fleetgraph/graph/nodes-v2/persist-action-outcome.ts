/**
 * persist_action_outcome - Shared Pipeline
 *
 * Lane: Shared
 * Type: Persistent store write
 * LLM: No
 *
 * Writes the approval decision and action result to the FleetGraph ledger.
 *
 * Writes:
 * - approval_request_id, decision, decision_at, action_endpoint, action_status
 * - If dismissed: dismissed_until with cooldown
 * - If snoozed: snoozed_until with user-selected time
 * - If approved and successful: resolved_at
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type { ResponsePayload, TraceMetadata } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface PersistActionOutcomeDeps {
  findingStore?: {
    recordActionOutcome(
      state: FleetGraphStateV2,
      snoozedUntil?: Date
    ): Promise<void>
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const SNOOZE_DURATION_HOURS = 4

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Persists the action outcome to the FleetGraph ledger.
 *
 * @param state - Current graph state with approval decision and action result
 * @param deps - Dependencies including finding store
 * @returns State update with response payload
 */
export async function persistActionOutcome(
  state: FleetGraphStateV2,
  deps: PersistActionOutcomeDeps = {}
): Promise<FleetGraphStateV2Update> {
  const now = new Date()
  const approval = state.pendingApproval
  const snoozedUntil = state.approvalDecision === 'snoozed'
    ? new Date(now.getTime() + SNOOZE_DURATION_HOURS * 60 * 60 * 1000)
    : undefined

  if (approval && deps.findingStore) {
    await deps.findingStore.recordActionOutcome(state, snoozedUntil)
  }

  // Build response payload based on outcome
  let responsePayload: ResponsePayload

  if (state.approvalDecision === 'approved' && state.actionResult?.success) {
    responsePayload = {
      type: 'chat_answer',
      answer: {
        text: `Action completed successfully: ${approval?.actionDraft.actionType ?? approval?.proposedAction.label ?? 'Unknown action'}`,
        entityLinks: approval ? [{
          id: approval.reasonedFinding.targetEntity.id,
          type: approval.reasonedFinding.targetEntity.type,
          name: approval.reasonedFinding.targetEntity.name,
        }] : [],
        suggestedNextSteps: [],
      },
    }
  } else if (state.approvalDecision === 'approved' && !state.actionResult?.success) {
    responsePayload = {
      type: 'degraded',
      disclaimer: `Action failed: ${state.actionResult?.errorMessage ?? 'Unknown error'}`,
    }
  } else if (state.approvalDecision === 'snoozed') {
    responsePayload = {
      type: 'chat_answer',
      answer: {
        text: `Finding snoozed for ${SNOOZE_DURATION_HOURS} hours.`,
        entityLinks: [],
        suggestedNextSteps: [],
      },
    }
  } else {
    responsePayload = {
      type: 'chat_answer',
      answer: {
        text: 'Finding dismissed.',
        entityLinks: [],
        suggestedNextSteps: [],
      },
    }
  }

  // Update trace metadata
  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    completedAt: now.toISOString(),
  }

  return {
    responsePayload,
    traceMetadata,
    path: ['persist_action_outcome'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type PersistActionOutcomeRoute = 'END'

/**
 * Always routes to END after persisting action outcome.
 */
export function routeFromPersistActionOutcome(
  _state: FleetGraphStateV2
): PersistActionOutcomeRoute {
  return 'END'
}
