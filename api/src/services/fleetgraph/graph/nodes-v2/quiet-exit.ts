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
  const responsePayload: ResponsePayload = { type: 'empty' }

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
