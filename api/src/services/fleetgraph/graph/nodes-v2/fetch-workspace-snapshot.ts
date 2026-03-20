/**
 * fetch_workspace_snapshot - Proactive Lane
 *
 * Lane: Proactive
 * Type: Parallel REST fan-out
 * LLM: No
 *
 * Fetches a complete workspace snapshot with 6 parallel REST calls:
 * - GET /api/projects
 * - GET /api/weeks
 * - GET /api/issues
 * - GET /api/team/people
 * - GET /api/accountability/action-items
 * - GET /api/documents?document_type=standup
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchWorkspaceSnapshot,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchWorkspaceSnapshotDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete workspace snapshot for proactive sweep analysis.
 *
 * Per spec: If projects or weeks fail (critical signals), route to fallback.
 *
 * @param state - Current graph state
 * @param deps - Dependencies including fetch config
 * @returns State update with raw workspace data
 */
export async function fetchWorkspaceSnapshotNode(
  state: FleetGraphStateV2,
  deps: FetchWorkspaceSnapshotDeps
): Promise<FleetGraphStateV2Update> {
  const snapshot = await fetchWorkspaceSnapshot(deps.config)

  // Check for critical failure (projects or weeks)
  const criticalFailure = snapshot.fetchErrors.some(
    (err) =>
      err.endpoint.includes('/api/projects') ||
      err.endpoint.includes('/api/weeks')
  )

  if (criticalFailure) {
    return {
      rawProjects: snapshot.projects,
      rawWeeks: snapshot.weeks,
      rawIssues: snapshot.issues,
      rawPeople: snapshot.people,
      rawAccountabilityItems: snapshot.accountabilityItems,
      rawTodayStandups: snapshot.todayStandups,
      fetchErrors: snapshot.fetchErrors,
      partialData: true,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'Critical proactive data (projects or weeks) unavailable',
      path: ['fetch_workspace_snapshot'],
    }
  }

  return {
    rawProjects: snapshot.projects,
    rawWeeks: snapshot.weeks,
    rawIssues: snapshot.issues,
    rawPeople: snapshot.people,
    rawAccountabilityItems: snapshot.accountabilityItems,
    rawTodayStandups: snapshot.todayStandups,
    fetchErrors: snapshot.fetchErrors,
    partialData: snapshot.partialData,
    path: ['fetch_workspace_snapshot'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchWorkspaceSnapshotRoute = 'identify_dirty_entities' | 'fallback_fetch'

/**
 * Routes to fallback on critical failure, otherwise to identify_dirty_entities.
 */
export function routeFromWorkspaceSnapshot(
  state: FleetGraphStateV2
): FetchWorkspaceSnapshotRoute {
  if (state.branch === 'fallback') {
    return 'fallback_fetch'
  }
  return 'identify_dirty_entities'
}
