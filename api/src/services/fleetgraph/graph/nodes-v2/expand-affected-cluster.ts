/**
 * expand_affected_cluster - Event-Driven Lane
 *
 * Lane: Event-Driven
 * Type: Conditional parallel REST fan-out
 * LLM: No
 *
 * Based on the write type, fetches parent and sibling context needed
 * to assess impact of the event.
 *
 * Expansion rules by write type:
 * - issue.state_change: Parent week cluster, parent project
 * - issue.reassignment: Parent week cluster, people data
 * - week.start: Week cluster (verify start succeeded)
 * - week.plan_submitted: Week cluster + project cluster
 * - project.approval_action: Project cluster
 * - standup.created: Week cluster
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchWeekCluster,
  fetchProjectCluster,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type { FetchError } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface ExpandAffectedClusterDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Expands affected context based on the dirty write type.
 *
 * @param state - Current graph state with dirty context
 * @param deps - Dependencies including fetch config
 * @returns State update with expanded cluster data
 */
export async function expandAffectedClusterNode(
  state: FleetGraphStateV2,
  deps: ExpandAffectedClusterDeps
): Promise<FleetGraphStateV2Update> {
  const writeType = state.dirtyWriteType
  const allErrors: FetchError[] = [...state.fetchErrors]
  const cachedPeople = state.rawPeople

  // Determine what to fetch based on write type
  let weekCluster = state.rawWeekCluster
  let projectCluster = state.rawProjectCluster

  switch (writeType) {
    case 'issue.state_change': {
      // Fetch parent week cluster and project for deadline risk re-check
      const issue = state.rawIssueCluster?.issue
      if (issue?.sprintId && !weekCluster) {
        const { cluster, errors } = await fetchWeekCluster(
          issue.sprintId,
          deps.config,
          cachedPeople
        )
        weekCluster = cluster
        allErrors.push(...errors)
      }
      if (issue?.projectId && !projectCluster) {
        const { cluster, errors } = await fetchProjectCluster(
          issue.projectId,
          deps.config,
          cachedPeople
        )
        projectCluster = cluster
        allErrors.push(...errors)
      }
      break
    }

    case 'issue.reassignment': {
      // Fetch parent week cluster for load re-check
      const issue = state.rawIssueCluster?.issue
      if (issue?.sprintId && !weekCluster) {
        const { cluster, errors } = await fetchWeekCluster(
          issue.sprintId,
          deps.config,
          cachedPeople
        )
        weekCluster = cluster
        allErrors.push(...errors)
      }
      break
    }

    case 'week.start': {
      // Week cluster should already be fetched, verify start succeeded
      // No additional fetch needed
      break
    }

    case 'week.plan_submitted': {
      // Fetch project cluster to check approval gap
      const week = state.rawWeekCluster?.week
      if (week?.projectId && !projectCluster) {
        const { cluster, errors } = await fetchProjectCluster(
          week.projectId,
          deps.config,
          cachedPeople
        )
        projectCluster = cluster
        allErrors.push(...errors)
      }
      break
    }

    case 'project.approval_action': {
      // Project cluster should already be fetched
      // No additional fetch needed
      break
    }

    case 'standup.created': {
      // Week cluster should already be fetched
      // This clears any pending missing-standup finding
      break
    }

    default:
      // Unknown write type - no additional expansion
      break
  }

  return {
    rawWeekCluster: weekCluster,
    rawProjectCluster: projectCluster,
    fetchErrors: allErrors,
    partialData: allErrors.length > 0,
    path: ['expand_affected_cluster'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type ExpandAffectedClusterRoute = 'normalize_ship_state'

/**
 * Always routes to normalize_ship_state after expansion.
 */
export function routeFromAffectedCluster(
  _state: FleetGraphStateV2
): ExpandAffectedClusterRoute {
  return 'normalize_ship_state'
}
