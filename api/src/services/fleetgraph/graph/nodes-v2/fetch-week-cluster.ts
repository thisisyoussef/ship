/**
 * fetch_week_cluster - On-Demand Lane
 *
 * Lane: On-Demand
 * Type: Parallel REST fan-out
 * LLM: No
 *
 * Fetches a complete week cluster with 6 parallel REST calls:
 * - Week detail
 * - Week issues
 * - Standups
 * - Review
 * - Scope changes
 * - People (if not cached)
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchWeekCluster,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchWeekClusterDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete week cluster.
 *
 * @param state - Current graph state with document ID
 * @param deps - Dependencies including fetch config
 * @returns State update with week cluster data
 */
export async function fetchWeekClusterNode(
  state: FleetGraphStateV2,
  deps: FetchWeekClusterDeps
): Promise<FleetGraphStateV2Update> {
  const weekId = state.surfaceWeekId ?? state.documentId

  if (!weekId) {
    return {
      rawWeekCluster: null,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'No week ID provided for cluster fetch',
      path: ['fetch_week_cluster'],
    }
  }

  // Use cached people if available
  const cachedPeople = state.rawPeople.length > 0 ? state.rawPeople : undefined

  const { cluster, errors } = await fetchWeekCluster(
    weekId,
    deps.config,
    cachedPeople
  )

  if (!cluster) {
    return {
      rawWeekCluster: null,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'FleetGraph could not load the sprint or week context for this analysis.',
      fetchErrors: errors,
      partialData: true,
      path: ['fetch_week_cluster'],
    }
  }

  return {
    rawWeekCluster: cluster,
    rawPeople: cluster?.relatedPeople ?? state.rawPeople,
    fetchErrors: errors,
    partialData: errors.length > 0,
    path: ['fetch_week_cluster'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchWeekClusterRoute = 'normalize_ship_state' | 'fallback_fetch'

/**
 * Always routes to normalize_ship_state after cluster fetch.
 */
export function routeFromWeekCluster(
  state: FleetGraphStateV2
): FetchWeekClusterRoute {
  return state.branch === 'fallback' ? 'fallback_fetch' : 'normalize_ship_state'
}
