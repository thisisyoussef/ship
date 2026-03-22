/**
 * check_dedupe_cooldown - Shared Pipeline
 *
 * Lane: Shared
 * Type: Persistent store read + deterministic filter
 * LLM: No
 *
 * For each potential finding, computes a fingerprint and checks the
 * FleetGraph persistent ledger. Suppresses findings that:
 * - Have unchanged evidence_hash AND cooldown has not expired
 * - Are snoozed_until > now
 * - Are dismissed_until > now
 *
 * Cooldown defaults:
 * - Accountability nudges (missing standup): same day, once
 * - Deadline risk: every 24 hours
 * - Workload imbalance: every 48 hours
 * - Approval gap: every 12 hours
 * - Week-start drift: every 4 hours
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type {
  CandidateFinding,
  DedupeHit,
  FleetGraphV2SuspectType,
  SuspectEntity,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface CheckDedupeCooldownDeps {
  findingStore?: {
    getActiveFindings(
      workspaceId: string,
      fingerprints: string[]
    ): Promise<DedupeHit[]>
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const COOLDOWN_HOURS: Record<FleetGraphV2SuspectType, number> = {
  week_start_drift: 4,
  empty_active_week: 4,
  missing_standup: 24, // Once per day
  approval_gap: 12,
  deadline_risk: 24,
  workload_imbalance: 48,
  blocker_aging: 24,
  sprint_no_owner: 12,
  unassigned_sprint_issues: 24,
}

// ──────────────────────────────────────────────────────────────────────────────
// Fingerprint Generation
// ──────────────────────────────────────────────────────────────────────────────

function computeFingerprint(suspect: SuspectEntity): string {
  // Simple hash: type + entity ID
  return `${suspect.type}:${suspect.entityId}`
}

function computeEvidenceHash(suspect: SuspectEntity): string {
  // Hash of metadata for change detection
  const metadataString = JSON.stringify(suspect.metadata ?? {})
  // Simple hash function
  let hash = 0
  for (let i = 0; i < metadataString.length; i++) {
    const char = metadataString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

function determineSeverity(
  suspect: SuspectEntity
): 'info' | 'warning' | 'critical' {
  switch (suspect.type) {
    case 'week_start_drift':
    case 'approval_gap':
      return 'warning'
    case 'deadline_risk':
    case 'blocker_aging':
      return 'critical'
    case 'empty_active_week':
    case 'missing_standup':
    case 'workload_imbalance':
      return 'info'
    default:
      return 'info'
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Checks for duplicate findings and applies cooldown suppression.
 *
 * @param state - Current graph state with suspect entities or normalized context
 * @param deps - Dependencies including finding store
 * @returns State update with candidate findings and suppression info
 */
export async function checkDedupeCooldown(
  state: FleetGraphStateV2,
  deps: CheckDedupeCooldownDeps = {}
): Promise<FleetGraphStateV2Update> {
  const now = new Date()
  const dedupeHits: DedupeHit[] = []
  const suppressedFingerprints: string[] = []
  const candidateFindings: CandidateFinding[] = []

  // Build candidates from suspect entities
  const suspects = state.suspectEntities

  // Generate fingerprints for all suspects
  const fingerprints = suspects.map(computeFingerprint)

  // Look up existing findings in the ledger
  let existingFindings: DedupeHit[] = []
  if (deps.findingStore && fingerprints.length > 0) {
    existingFindings = await deps.findingStore.getActiveFindings(
      state.workspaceId,
      fingerprints
    )
  }

  // Build lookup map
  const existingByFingerprint = new Map(
    existingFindings.map((f) => [f.fingerprint, f])
  )

  // Process each suspect
  for (const suspect of suspects) {
    const fingerprint = computeFingerprint(suspect)
    const evidenceHash = computeEvidenceHash(suspect)
    const existing = existingByFingerprint.get(fingerprint)

    // Check suppression conditions
    let suppressed = false
    let suppressReason: string | undefined

    if (existing) {
      // Check if snoozed
      if (existing.snoozedUntil) {
        const snoozedUntil = new Date(existing.snoozedUntil)
        if (snoozedUntil > now) {
          suppressed = true
          suppressReason = `Snoozed until ${existing.snoozedUntil}`
        }
      }

      // Check if dismissed
      if (!suppressed && existing.dismissedUntil) {
        const dismissedUntil = new Date(existing.dismissedUntil)
        if (dismissedUntil > now) {
          suppressed = true
          suppressReason = `Dismissed until ${existing.dismissedUntil}`
        }
      }

      // Check cooldown (only suppress if evidence is unchanged)
      if (!suppressed) {
        const cooldownUntil = new Date(existing.cooldownUntil)
        const evidenceChanged = existing.evidenceHash !== undefined
          && existing.evidenceHash !== evidenceHash
        if (cooldownUntil > now && !evidenceChanged) {
          suppressed = true
          suppressReason = `Cooldown active until ${existing.cooldownUntil}`
        }
      }
    }

    if (suppressed) {
      suppressedFingerprints.push(fingerprint)
      dedupeHits.push({
        fingerprint,
        findingType: suspect.type,
        entityId: suspect.entityId,
        lastNotifiedAt: existing?.lastNotifiedAt ?? now.toISOString(),
        cooldownUntil: existing?.cooldownUntil ?? now.toISOString(),
        evidenceHash,
        snoozedUntil: existing?.snoozedUntil,
        dismissedUntil: existing?.dismissedUntil,
      })
    } else {
      // Not suppressed - add to candidates
      candidateFindings.push({
        fingerprint,
        findingType: suspect.type,
        targetEntityId: suspect.entityId,
        targetEntityType: suspect.entityType,
        severity: determineSeverity(suspect),
        rawData: suspect.metadata ?? {},
      })
    }
  }

  return {
    dedupeHits,
    suppressedFingerprints,
    candidateFindings,
    path: ['check_dedupe_cooldown'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type CheckDedupeCooldownRoute = 'score_candidates'

/**
 * Always routes to score_candidates after dedupe check.
 */
export function routeFromDedupeCooldown(
  _state: FleetGraphStateV2
): CheckDedupeCooldownRoute {
  return 'score_candidates'
}
