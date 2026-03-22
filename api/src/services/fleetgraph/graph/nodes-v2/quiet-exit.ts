/**
 * quiet_exit - Shared Pipeline (Quiet Branch)
 *
 * Lane: Shared
 * Type: Deterministic
 * LLM: No
 *
 * Produces an empty response payload for clean sweeps.
 * Tags the trace with branch:quiet. This is the fast-exit path
 * that keeps clean sweeps cheap (0 LLM calls).
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type { ResponsePayload, TraceMetadata } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Produces an empty response for quiet branch (nothing to surface).
 *
 * @param state - Current graph state
 * @returns State update with empty response payload
 */
export function quietExit(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  const quietMessage = state.userQuestion
    ? `I checked this ${state.documentType ?? 'document'} against your question and did not find an immediate issue to flag.`
    : `No quick actions are needed right now. I analyzed this ${state.documentType ?? 'document'} and did not find anything that needs immediate attention.`

  const responsePayload: ResponsePayload = {
    type: 'chat_answer',
    answer: {
      entityLinks: [],
      suggestedNextSteps: [],
      text: quietMessage,
    },
  }

  // Update trace metadata with branch
  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    branch: 'quiet',
    candidateCount: state.candidateFindings.length,
    findingTypes: state.scoredFindings.map(
      (f) => f.findingType
    ) as TraceMetadata['findingTypes'],
    dedupeHit: state.dedupeHits.length > 0,
    completedAt: new Date().toISOString(),
  }

  return {
    ...(state.mode === 'on_demand'
      ? {
          conversationHistory: [
            ...state.conversationHistory,
            ...(state.userQuestion
              ? [{
                  content: state.userQuestion,
                  role: 'user' as const,
                  timestamp: new Date().toISOString(),
                }]
              : []),
            {
              content: responsePayload.type === 'chat_answer'
                ? responsePayload.answer.text
                : 'No issues detected.',
              role: 'assistant' as const,
              timestamp: new Date().toISOString(),
            },
          ],
          turnCount: state.turnCount + 1,
        }
      : {}),
    responsePayload,
    traceMetadata,
    path: ['quiet_exit'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type QuietExitRoute = 'persist_run_state'

/**
 * Always routes to persist_run_state after quiet exit.
 */
export function routeFromQuietExit(
  _state: FleetGraphStateV2
): QuietExitRoute {
  return 'persist_run_state'
}
