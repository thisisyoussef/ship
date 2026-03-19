/**
 * score_candidates - Shared Pipeline
 *
 * Lane: Shared
 * Type: Deterministic scorer
 * LLM: No
 *
 * Scores candidate findings across four dimensions:
 * - Urgency (0.30): Time pressure - days until deadline, hours overdue
 * - Impact (0.25): Scope - issue count, estimate sum, priority distribution
 * - Actionability (0.25): Clear owner, available endpoint, approval path
 * - Confidence (0.20): Data completeness, partial_data penalty
 *
 * Branch decision:
 * - on_demand with user_question → advisory (always reason)
 * - No candidate ≥ 30 after dedupe → quiet
 * - Candidate ≥ 30, no mutation → advisory
 * - Candidate ≥ 30, has mutation → action_required
 * - Required data missing → fallback
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type {
  CandidateFinding,
  FleetGraphV2Branch,
  FleetGraphV2SuspectType,
  ScoreDimensions,
  ScoredFinding,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
  urgency: 0.30,
  impact: 0.25,
  actionability: 0.25,
  confidence: 0.20,
}

const BRANCH_THRESHOLD = 30

// Finding types that propose Ship mutations
const MUTATION_FINDING_TYPES: FleetGraphV2SuspectType[] = [
  'week_start_drift',
  'approval_gap',
]

// ──────────────────────────────────────────────────────────────────────────────
// Scoring Functions
// ──────────────────────────────────────────────────────────────────────────────

function scoreUrgency(finding: CandidateFinding): number {
  const metadata = finding.rawData as Record<string, unknown>

  switch (finding.findingType) {
    case 'week_start_drift': {
      // Higher urgency the longer it's been overdue
      const hoursSinceStart = (metadata.hoursSinceStart as number) ?? 0
      if (hoursSinceStart > 48) return 90
      if (hoursSinceStart > 24) return 70
      if (hoursSinceStart > 8) return 50
      return 30
    }

    case 'deadline_risk': {
      const daysUntil = (metadata.daysUntil as number) ?? 7
      if (daysUntil <= 1) return 95
      if (daysUntil <= 3) return 80
      if (daysUntil <= 5) return 60
      return 40
    }

    case 'approval_gap': {
      const businessDays = (metadata.businessDaysSinceSubmission as number) ?? 0
      if (businessDays > 3) return 80
      if (businessDays > 1) return 60
      return 40
    }

    case 'blocker_aging': {
      const businessDays = (metadata.businessDaysSinceUpdate as number) ?? 0
      if (businessDays > 5) return 85
      if (businessDays > 3) return 65
      return 45
    }

    case 'empty_active_week':
      return 40

    case 'missing_standup':
      return 35

    case 'workload_imbalance':
      return 30

    default:
      return 25
  }
}

function scoreImpact(finding: CandidateFinding): number {
  const metadata = finding.rawData as Record<string, unknown>

  switch (finding.findingType) {
    case 'deadline_risk': {
      const issueCount = (metadata.openIssueCount as number) ?? 0
      const hasHighPriority = metadata.hasStaleHighPriority as boolean
      let score = Math.min(40 + issueCount * 8, 90)
      if (hasHighPriority) score += 15
      return Math.min(score, 100)
    }

    case 'workload_imbalance': {
      const percentOfTotal = (metadata.percentOfTotal as number) ?? 0
      return Math.min(30 + percentOfTotal * 80, 85)
    }

    case 'week_start_drift':
    case 'empty_active_week':
      return 50 // Medium impact - affects sprint planning

    case 'approval_gap':
      return 55 // Blocks team progress

    case 'blocker_aging':
      return 60 // Actively blocking work

    case 'missing_standup':
      return 25 // Low impact, visibility issue

    default:
      return 30
  }
}

function scoreActionability(finding: CandidateFinding): number {
  switch (finding.findingType) {
    case 'week_start_drift':
      // Clear action: start the week
      return 90

    case 'approval_gap':
      // Clear action: approve or request changes
      return 85

    case 'empty_active_week':
      // Action: add issues or reconsider status
      return 60

    case 'blocker_aging':
      // Action: escalate or reassign
      return 55

    case 'deadline_risk':
      // Multiple possible actions
      return 50

    case 'workload_imbalance':
      // Action: redistribute work
      return 45

    case 'missing_standup':
      // Action: remind person
      return 40

    default:
      return 30
  }
}

function scoreConfidence(
  finding: CandidateFinding,
  partialData: boolean
): number {
  let score = 80

  // Penalty for partial data
  if (partialData) {
    score -= 20
  }

  // Finding-specific adjustments
  switch (finding.findingType) {
    case 'week_start_drift':
    case 'empty_active_week':
      // High confidence - deterministic checks
      break

    case 'workload_imbalance':
      // Lower confidence - heuristic-based
      score -= 10
      break

    case 'blocker_aging':
      // Medium confidence - proxy detection
      score -= 5
      break
  }

  return Math.max(score, 20)
}

function computeCompositeScore(dimensions: ScoreDimensions): number {
  return Math.round(
    dimensions.urgency * WEIGHTS.urgency +
    dimensions.impact * WEIGHTS.impact +
    dimensions.actionability * WEIGHTS.actionability +
    dimensions.confidence * WEIGHTS.confidence
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Scores candidate findings and determines the branch.
 *
 * Uses a fingerprint-based cache to ensure consistent scores within a thread.
 * Once a finding is scored, subsequent appearances get the cached score.
 *
 * @param state - Current graph state with candidate findings
 * @returns State update with scored findings and branch decision
 */
export function scoreCandidates(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  const scoredFindings: ScoredFinding[] = []
  const suppressedSet = new Set(state.suppressedFingerprints)
  const existingCache = state.scoreCache ?? {}
  const updatedCache: Record<string, number> = { ...existingCache }

  for (const candidate of state.candidateFindings) {
    const suppressed = suppressedSet.has(candidate.fingerprint)

    // Check cache first for consistent scoring within a thread
    const cachedScore = existingCache[candidate.fingerprint]

    const dimensions: ScoreDimensions = {
      urgency: scoreUrgency(candidate),
      impact: scoreImpact(candidate),
      actionability: scoreActionability(candidate),
      confidence: scoreConfidence(candidate, state.partialData),
    }

    // Use cached score if available, otherwise compute and cache
    const compositeScore = cachedScore !== undefined
      ? cachedScore
      : computeCompositeScore(dimensions)

    // Store in cache for future invocations in this thread
    if (cachedScore === undefined) {
      updatedCache[candidate.fingerprint] = compositeScore
    }

    scoredFindings.push({
      ...candidate,
      dimensions,
      compositeScore,
      suppressed,
      suppressReason: suppressed ? 'Dedupe/cooldown active' : undefined,
    })
  }

  // Sort by composite score descending
  scoredFindings.sort((a, b) => b.compositeScore - a.compositeScore)

  // Determine branch
  let branch: FleetGraphV2Branch

  // On-demand with user question always goes to advisory
  if (state.mode === 'on_demand' && state.userQuestion) {
    branch = 'advisory'
  }
  // Check for qualifying findings
  else {
    const qualifyingFindings = scoredFindings.filter(
      (f) => !f.suppressed && f.compositeScore >= BRANCH_THRESHOLD
    )

    if (qualifyingFindings.length === 0) {
      branch = 'quiet'
    } else {
      // Check if any finding proposes a mutation
      const hasMutation = qualifyingFindings.some((f) =>
        MUTATION_FINDING_TYPES.includes(f.findingType as FleetGraphV2SuspectType)
      )

      branch = hasMutation ? 'action_required' : 'advisory'
    }
  }

  return {
    scoredFindings,
    scoreCache: updatedCache,
    branch,
    path: ['score_candidates'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type ScoreCandidatesRoute =
  | 'quiet_exit'
  | 'reason_findings'
  | 'fallback'

/**
 * Routes based on the determined branch.
 */
export function routeFromScoreCandidates(
  state: FleetGraphStateV2
): ScoreCandidatesRoute {
  switch (state.branch) {
    case 'quiet':
      return 'quiet_exit'
    case 'advisory':
    case 'action_required':
      return 'reason_findings'
    case 'fallback':
    default:
      return 'fallback'
  }
}
