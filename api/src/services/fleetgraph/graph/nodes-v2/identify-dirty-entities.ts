/**
 * identify_dirty_entities - Proactive Lane
 *
 * Lane: Proactive
 * Type: Deterministic filter
 * LLM: No
 *
 * Applies deterministic threshold checks to identify suspect entities
 * that need deeper analysis. This is the rule-gating layer that keeps
 * clean sweeps token-free.
 */

import { detectSuspectEntities } from '../suspect-detectors.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

export function identifyDirtyEntities(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  return {
    path: ['identify_dirty_entities'],
    suspectEntities: detectSuspectEntities({
      issues: state.rawIssues,
      people: state.rawPeople,
      projects: state.rawProjects,
      todayStandups: state.rawTodayStandups,
      weeks: state.rawWeeks,
    }),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type IdentifyDirtyEntitiesRoute = 'expand_suspects' | 'normalize_ship_state'

export function routeFromDirtyEntities(
  state: FleetGraphStateV2
): IdentifyDirtyEntitiesRoute {
  return state.suspectEntities.length > 0
    ? 'expand_suspects'
    : 'normalize_ship_state'
}
