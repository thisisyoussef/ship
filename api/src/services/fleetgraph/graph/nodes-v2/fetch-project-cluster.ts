/**
 * fetch_project_cluster - On-Demand Lane
 *
 * Lane: On-Demand
 * Type: Parallel REST fan-out
 * LLM: No
 *
 * Fetches a complete project cluster with 6 parallel REST calls:
 * - Project detail
 * - Project issues
 * - Project weeks
 * - Retro
 * - Activity
 * - People (if not cached)
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchProjectCluster,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchProjectClusterDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete project cluster.
 *
 * @param state - Current graph state with document ID or project context ID
 * @param deps - Dependencies including fetch config
 * @returns State update with project cluster data
 */
export async function fetchProjectClusterNode(
  state: FleetGraphStateV2,
  deps: FetchProjectClusterDeps
): Promise<FleetGraphStateV2Update> {
  // Use project context ID if available (for weekly plan/retro), otherwise document ID
  const projectId = state.surfaceProjectId ?? state.projectContextId ?? state.documentId

  if (!projectId) {
    return {
      rawProjectCluster: null,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'No project ID provided for cluster fetch',
      path: ['fetch_project_cluster'],
    }
  }

  // Use cached people if available
  const cachedPeople = state.rawPeople.length > 0 ? state.rawPeople : undefined

  const { cluster, errors } = await fetchProjectCluster(
    projectId,
    deps.config,
    cachedPeople
  )

  if (!cluster) {
    return {
      rawProjectCluster: null,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'FleetGraph could not load the project context for this analysis.',
      fetchErrors: errors,
      partialData: true,
      path: ['fetch_project_cluster'],
    }
  }

  return {
    rawProjectCluster: cluster,
    rawPeople: cluster?.relatedPeople ?? state.rawPeople,
    fetchErrors: errors,
    partialData: errors.length > 0,
    path: ['fetch_project_cluster'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchProjectClusterRoute = 'normalize_ship_state' | 'fallback_fetch'

/**
 * Always routes to normalize_ship_state after cluster fetch.
 */
export function routeFromProjectCluster(
  state: FleetGraphStateV2
): FetchProjectClusterRoute {
  return state.branch === 'fallback' ? 'fallback_fetch' : 'normalize_ship_state'
}
