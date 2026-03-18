/**
 * fetch_program_cluster - On-Demand Lane
 *
 * Lane: On-Demand
 * Type: Parallel REST fan-out
 * LLM: No
 *
 * Fetches a complete program cluster:
 * - Program detail
 * - Related projects
 * - Related weeks
 * - People (if not cached)
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchProgramCluster,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchProgramClusterDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete program cluster.
 *
 * @param state - Current graph state with document ID
 * @param deps - Dependencies including fetch config
 * @returns State update with program cluster data
 */
export async function fetchProgramClusterNode(
  state: FleetGraphStateV2,
  deps: FetchProgramClusterDeps
): Promise<FleetGraphStateV2Update> {
  const programId = state.documentId

  if (!programId) {
    return {
      rawProgramCluster: null,
      branch: 'fallback',
      fallbackReason: 'No program ID provided for cluster fetch',
      path: ['fetch_program_cluster'],
    }
  }

  // Use cached people if available
  const cachedPeople = state.rawPeople.length > 0 ? state.rawPeople : undefined

  const { cluster, errors } = await fetchProgramCluster(
    programId,
    deps.config,
    cachedPeople
  )

  return {
    rawProgramCluster: cluster,
    rawPeople: cluster?.relatedPeople ?? state.rawPeople,
    fetchErrors: errors,
    partialData: errors.length > 0,
    path: ['fetch_program_cluster'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchProgramClusterRoute = 'normalize_ship_state'

/**
 * Always routes to normalize_ship_state after cluster fetch.
 */
export function routeFromProgramCluster(
  _state: FleetGraphStateV2
): FetchProgramClusterRoute {
  return 'normalize_ship_state'
}
