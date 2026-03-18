/**
 * fetch_issue_cluster - On-Demand Lane
 *
 * Lane: On-Demand
 * Type: Parallel REST fan-out
 * LLM: No
 *
 * Fetches a complete issue cluster with 6 parallel REST calls:
 * - Issue detail
 * - History
 * - Iterations
 * - Children
 * - Comments
 * - People (if not cached)
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchIssueCluster,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchIssueClusterDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete issue cluster.
 *
 * @param state - Current graph state with document ID
 * @param deps - Dependencies including fetch config
 * @returns State update with issue cluster data
 */
export async function fetchIssueClusterNode(
  state: FleetGraphStateV2,
  deps: FetchIssueClusterDeps
): Promise<FleetGraphStateV2Update> {
  const issueId = state.documentId

  if (!issueId) {
    return {
      rawIssueCluster: null,
      branch: 'fallback',
      fallbackReason: 'No issue ID provided for cluster fetch',
      path: ['fetch_issue_cluster'],
    }
  }

  // Use cached people if available
  const cachedPeople = state.rawPeople.length > 0 ? state.rawPeople : undefined

  const { cluster, errors } = await fetchIssueCluster(
    issueId,
    deps.config,
    cachedPeople
  )

  return {
    rawIssueCluster: cluster,
    rawPeople: cluster?.relatedPeople ?? state.rawPeople,
    fetchErrors: errors,
    partialData: errors.length > 0,
    path: ['fetch_issue_cluster'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchIssueClusterRoute = 'normalize_ship_state'

/**
 * Always routes to normalize_ship_state after cluster fetch.
 */
export function routeFromIssueCluster(
  _state: FleetGraphStateV2
): FetchIssueClusterRoute {
  return 'normalize_ship_state'
}
