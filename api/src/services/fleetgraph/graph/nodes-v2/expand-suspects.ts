/**
 * expand_suspects - Proactive Lane
 *
 * Lane: Proactive
 * Type: Conditional parallel REST fan-out
 * LLM: No
 *
 * For each suspect entity identified by identify_dirty_entities,
 * fetches the deeper cluster needed for scoring and reasoning.
 *
 * Expansion rules by suspect type:
 * - week_start_drift: Week cluster (issues, standups, review, scope changes)
 * - empty_active_week: Week cluster
 * - deadline_risk: Project cluster (issues, weeks, activity)
 * - workload_imbalance: Assignments and sprint metrics
 * - blocker_aging: Issue iterations and history
 * - missing_standup: Week standups
 * - approval_gap: Week or project approval data
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchWeekCluster,
  fetchProjectCluster,
  fetchIssueCluster,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type {
  SuspectEntity,
  IssueCluster,
  WeekCluster,
  ProjectCluster,
  ShipPerson,
  FetchError,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface ExpandSuspectsDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Expansion Logic
// ──────────────────────────────────────────────────────────────────────────────

interface ExpansionResult {
  weekClusters: Map<string, WeekCluster>
  projectClusters: Map<string, ProjectCluster>
  issueClusters: Map<string, IssueCluster>
  errors: FetchError[]
}

async function expandSuspect(
  suspect: SuspectEntity,
  deps: ExpandSuspectsDeps,
  cachedPeople: ShipPerson[],
  expandedIds: Set<string>
): Promise<ExpansionResult> {
  const result: ExpansionResult = {
    weekClusters: new Map(),
    projectClusters: new Map(),
    issueClusters: new Map(),
    errors: [],
  }

  switch (suspect.type) {
    case 'week_start_drift':
    case 'empty_active_week':
    case 'missing_standup':
    case 'approval_gap': {
      // Expand week cluster
      const weekId = suspect.weekId ?? suspect.entityId
      if (weekId && !expandedIds.has(`week:${weekId}`)) {
        expandedIds.add(`week:${weekId}`)
        const { cluster, errors } = await fetchWeekCluster(
          weekId,
          deps.config,
          cachedPeople
        )
        if (cluster) {
          result.weekClusters.set(weekId, cluster)
        }
        result.errors.push(...errors)
      }
      break
    }

    case 'deadline_risk': {
      // Expand project cluster
      const projectId = suspect.projectId ?? suspect.entityId
      if (projectId && !expandedIds.has(`project:${projectId}`)) {
        expandedIds.add(`project:${projectId}`)
        const { cluster, errors } = await fetchProjectCluster(
          projectId,
          deps.config,
          cachedPeople
        )
        if (cluster) {
          result.projectClusters.set(projectId, cluster)
        }
        result.errors.push(...errors)
      }
      break
    }

    case 'workload_imbalance': {
      // For workload imbalance, we need assignments data
      // This is already available in the workspace snapshot
      // Just mark as expanded
      break
    }

    case 'blocker_aging': {
      // Expand issue cluster
      const issueId = suspect.entityId
      if (issueId && !expandedIds.has(`issue:${issueId}`)) {
        expandedIds.add(`issue:${issueId}`)
        const { cluster, errors } = await fetchIssueCluster(
          issueId,
          deps.config,
          cachedPeople
        )
        if (cluster) {
          result.issueClusters.set(issueId, cluster)
        }
        result.errors.push(...errors)
      }
      break
    }
  }

  return result
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Expands suspect entities by fetching their deeper clusters.
 *
 * Uses parallel fan-out to fetch all suspect clusters concurrently.
 *
 * @param state - Current graph state with suspect entities
 * @param deps - Dependencies including fetch config
 * @returns State update with expanded cluster data
 */
export async function expandSuspects(
  state: FleetGraphStateV2,
  deps: ExpandSuspectsDeps
): Promise<FleetGraphStateV2Update> {
  const expandedIds = new Set<string>()
  const allErrors: FetchError[] = []

  // Merge week clusters
  let mergedWeekCluster: WeekCluster | null = state.rawWeekCluster

  // Merge project clusters
  let mergedProjectCluster: ProjectCluster | null = state.rawProjectCluster

  // Merge issue clusters
  let mergedIssueCluster: IssueCluster | null = state.rawIssueCluster

  // Expand all suspects in parallel
  const expansionPromises = state.suspectEntities.map((suspect) =>
    expandSuspect(suspect, deps, state.rawPeople, expandedIds)
  )

  const results = await Promise.all(expansionPromises)

  // Merge all results
  for (const result of results) {
    allErrors.push(...result.errors)

    // Merge week clusters - take the first one as primary
    for (const [weekId, cluster] of result.weekClusters) {
      if (!mergedWeekCluster) {
        mergedWeekCluster = cluster
      }
      // Additional clusters could be stored in metadata if needed
    }

    // Merge project clusters
    for (const [projectId, cluster] of result.projectClusters) {
      if (!mergedProjectCluster) {
        mergedProjectCluster = cluster
      }
    }

    // Merge issue clusters
    for (const [issueId, cluster] of result.issueClusters) {
      if (!mergedIssueCluster) {
        mergedIssueCluster = cluster
      }
    }
  }

  return {
    rawWeekCluster: mergedWeekCluster,
    rawProjectCluster: mergedProjectCluster,
    rawIssueCluster: mergedIssueCluster,
    fetchErrors: allErrors,
    partialData: state.partialData || allErrors.length > 0,
    path: ['expand_suspects'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type ExpandSuspectsRoute = 'normalize_ship_state'

/**
 * Always routes to normalize_ship_state after expansion.
 */
export function routeFromExpandSuspects(
  _state: FleetGraphStateV2
): ExpandSuspectsRoute {
  return 'normalize_ship_state'
}
