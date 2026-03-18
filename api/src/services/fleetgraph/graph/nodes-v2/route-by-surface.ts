/**
 * route_by_surface - On-Demand Lane
 *
 * Lane: On-Demand
 * Type: Deterministic router
 * LLM: No
 *
 * Routes to the appropriate cluster fetch node based on document type.
 *
 * Routing rules:
 * - issue → fetch_issue_cluster
 * - sprint → fetch_week_cluster
 * - project → fetch_project_cluster
 * - program → fetch_program_cluster
 * - weekly_plan or weekly_retro → fetch_week_cluster + fetch_project_cluster
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type { FleetGraphV2DocumentType } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Routing Types
// ──────────────────────────────────────────────────────────────────────────────

export type RouteBySurfaceTarget =
  | 'fetch_issue_cluster'
  | 'fetch_week_cluster'
  | 'fetch_project_cluster'
  | 'fetch_program_cluster'
  | 'fallback'

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Routes to the appropriate cluster fetch based on document type.
 *
 * This node doesn't modify state, it only determines routing.
 *
 * @param state - Current graph state with document type
 * @returns State update with path recorded
 */
export function routeBySurface(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  return {
    path: ['route_by_surface'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Determines the next node based on document type.
 */
export function routeFromSurface(
  state: FleetGraphStateV2
): RouteBySurfaceTarget | RouteBySurfaceTarget[] {
  const docType = state.documentType ?? state.rawPrimaryDocument?.documentType

  if (!docType) {
    return 'fallback'
  }

  // Normalize document type
  const normalizedType = docType.toLowerCase().replace(/_/g, '-')

  switch (normalizedType) {
    case 'issue':
      return 'fetch_issue_cluster'

    case 'sprint':
    case 'week':
      return 'fetch_week_cluster'

    case 'project':
      return 'fetch_project_cluster'

    case 'program':
      return 'fetch_program_cluster'

    case 'weekly-plan':
    case 'weekly-retro':
    case 'weeklyplan':
    case 'weeklyretro':
      // For weekly plan/retro, fetch both week and project clusters
      return state.projectContextId
        ? ['fetch_week_cluster', 'fetch_project_cluster']
        : 'fetch_week_cluster'

    default:
      // Unknown document type - try to fetch as-is
      console.warn(`FleetGraph: Unknown document type "${docType}", defaulting to issue cluster`)
      return 'fetch_issue_cluster'
  }
}
