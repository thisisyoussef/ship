/**
 * persist_run_state - Shared Pipeline (Terminal Persistence)
 *
 * Lane: Shared (quiet + advisory paths)
 * Type: Persistent store write
 * LLM: No
 *
 * Writes run state to the FleetGraph persistent ledger:
 * - For each surfaced finding: insight_fingerprint, evidence_hash, timestamps
 * - For quiet runs: update last_seen_at on existing findings
 * - Trace metadata finalization
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type { TraceMetadata } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface PersistRunStateDeps {
  findingStore?: {
    recordRunState(params: {
      runId: string
      workspaceId: string
      branch: string
      candidateCount: number
      findingTypes: string[]
      dedupeHit: boolean
      surfacedFindings: Array<{
        fingerprint: string
        evidenceHash: string
        findingType: string
        entityId: string
      }>
      traceMetadata: TraceMetadata
    }): Promise<void>
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Persists the final run state to the FleetGraph ledger.
 *
 * @param state - Current graph state
 * @param deps - Dependencies including finding store
 * @returns Final state update
 */
export async function persistRunState(
  state: FleetGraphStateV2,
  deps: PersistRunStateDeps = {}
): Promise<FleetGraphStateV2Update> {
  const now = new Date()

  // Finalize trace metadata
  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    branch: state.branch,
    candidateCount: state.candidateFindings.length,
    findingTypes: state.scoredFindings.map(
      (f) => f.findingType
    ) as TraceMetadata['findingTypes'],
    dedupeHit: state.dedupeHits.length > 0,
    shipApiCalls: state.fetchErrors.length + state.rawProjects.length +
      (state.rawWeekCluster ? 6 : 0) + (state.rawProjectCluster ? 6 : 0) +
      (state.rawIssueCluster ? 6 : 0),
    completedAt: now.toISOString(),
  }

  // Build surfaced findings for persistence
  const surfacedFindings = (state.reasonedFindings ?? []).map((f) => {
    const scored = state.scoredFindings.find(
      (s) => s.fingerprint === f.fingerprint
    )
    return {
      fingerprint: f.fingerprint,
      evidenceHash: scored?.fingerprint ?? f.fingerprint, // Use fingerprint as evidence hash
      findingType: f.findingType,
      entityId: f.targetEntity.id,
    }
  })

  // Persist to store if available
  if (deps.findingStore) {
    await deps.findingStore.recordRunState({
      runId: state.runId,
      workspaceId: state.workspaceId,
      branch: state.branch,
      candidateCount: state.candidateFindings.length,
      findingTypes: state.scoredFindings.map((f) => f.findingType),
      dedupeHit: state.dedupeHits.length > 0,
      surfacedFindings,
      traceMetadata,
    })
  }

  return {
    traceMetadata,
    path: ['persist_run_state'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type PersistRunStateRoute = 'END'

/**
 * Always routes to END after persisting run state.
 */
export function routeFromPersistRunState(
  _state: FleetGraphStateV2
): PersistRunStateRoute {
  return 'END'
}
