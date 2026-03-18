/**
 * reason_findings - Shared Pipeline (Advisory + Action Branches)
 *
 * Lane: Shared
 * Type: LLM reasoning
 * LLM: **Yes** - this is the first (and often only) LLM call in the graph
 *
 * For each scored finding, produces:
 * - 1-3 sentence explanation of why the human should care right now
 * - Names specific person, entity, and deadline involved
 * - Proposes concrete next action with requires_approval flag
 *
 * Token budget:
 * - Proactive: ~4,700 tokens total
 * - On-demand: ~7,000 tokens total
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type {
  FleetGraphV2SuspectType,
  ProposedAction,
  ReasonedFinding,
  ScoredFinding,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface ReasonFindingsDeps {
  llm?: {
    invoke(prompt: string): Promise<string>
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Templates
// ──────────────────────────────────────────────────────────────────────────────

const FINDING_TEMPLATES: Record<FleetGraphV2SuspectType, {
  title: (metadata: Record<string, unknown>) => string
  explanation: (metadata: Record<string, unknown>) => string
  action?: {
    label: string
    method: 'POST' | 'PATCH'
    pathTemplate: string
    requiresApproval: boolean
  }
}> = {
  week_start_drift: {
    title: (m) => `Week "${m.weekTitle ?? 'Untitled'}" is still in planning`,
    explanation: (m) => {
      const hours = Math.round(m.hoursSinceStart as number ?? 0)
      return `This week started ${hours} hours ago but is still marked as "planning". ` +
        `The team may be waiting for it to become active to begin work. ` +
        `Starting the week will unlock issue tracking and standup submission.`
    },
    action: {
      label: 'Start this week',
      method: 'POST',
      pathTemplate: '/api/weeks/{entityId}/start',
      requiresApproval: true,
    },
  },

  empty_active_week: {
    title: (m) => `Active week "${m.weekTitle ?? 'Untitled'}" has no issues`,
    explanation: (_m) =>
      `This week is marked as "active" but has no issues assigned to it. ` +
      `Either issues need to be added, or the week status should be reconsidered.`,
  },

  missing_standup: {
    title: (m) => `${m.personName ?? 'A team member'} hasn't posted a standup`,
    explanation: (m) =>
      `It's past noon and ${m.personName ?? 'this person'} has active issues ` +
      `but hasn't posted a standup update today. Consider reaching out.`,
  },

  approval_gap: {
    title: (m) => `${m.entityTitle ?? 'A submission'} needs review`,
    explanation: (m) => {
      const days = Math.round(m.businessDaysSinceSubmission as number ?? 0)
      return `This ${m.entityType ?? 'item'} was submitted ${days} business day(s) ago ` +
        `and is still awaiting approval. The submitter may be blocked.`
    },
    action: {
      label: 'Review and approve',
      method: 'POST',
      pathTemplate: '/api/{entityType}s/{entityId}/approve-plan',
      requiresApproval: true,
    },
  },

  deadline_risk: {
    title: (m) => `Project "${m.projectTitle ?? 'Untitled'}" deadline at risk`,
    explanation: (m) => {
      const days = Math.round(m.daysUntil as number ?? 0)
      const issues = m.openIssueCount as number ?? 0
      return `Target date is in ${days} day(s) with ${issues} open issues. ` +
        `${m.hasStaleHighPriority ? 'At least one high-priority issue is stale. ' : ''}` +
        `Consider reviewing scope or timeline.`
    },
  },

  workload_imbalance: {
    title: (m) => `${m.personName ?? 'A team member'} may be overloaded`,
    explanation: (m) => {
      const percent = Math.round((m.percentOfTotal as number ?? 0) * 100)
      return `This person has ${percent}% of the team's open work estimate. ` +
        `Consider redistributing issues to balance the load.`
    },
  },

  blocker_aging: {
    title: (m) => `Issue "${m.issueTitle ?? 'Untitled'}" has an aging blocker`,
    explanation: (m) => {
      const days = Math.round(m.businessDaysSinceUpdate as number ?? 0)
      return `This issue has reported a blocker for ${days} business days without update. ` +
        `Consider escalating or reassigning.`
    },
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// Reasoning Logic
// ──────────────────────────────────────────────────────────────────────────────

function reasonFinding(
  scored: ScoredFinding,
  state: FleetGraphStateV2
): { reasoned: ReasonedFinding; action?: ProposedAction } {
  const template = FINDING_TEMPLATES[scored.findingType as FleetGraphV2SuspectType]

  if (!template) {
    // Fallback for unknown finding types
    return {
      reasoned: {
        fingerprint: scored.fingerprint,
        findingType: scored.findingType as FleetGraphV2SuspectType,
        title: `Finding: ${scored.findingType}`,
        explanation: `A ${scored.findingType} was detected for entity ${scored.targetEntityId}.`,
        targetEntity: {
          id: scored.targetEntityId,
          type: scored.targetEntityType,
          name: scored.targetEntityId,
        },
        severity: scored.severity,
      },
    }
  }

  // Enrich metadata with resolved names
  const metadata: Record<string, unknown> = {
    ...scored.rawData,
  }

  // Try to resolve entity names from normalized context
  const entity = state.normalizedContext?.nodes.find(
    (n) => n.id === scored.targetEntityId
  )
  if (entity) {
    metadata.entityTitle = entity.title
    if (entity.type === 'week') metadata.weekTitle = entity.title
    if (entity.type === 'project') metadata.projectTitle = entity.title
    if (entity.type === 'issue') metadata.issueTitle = entity.title
  }

  // Resolve person names
  const person = state.normalizedContext?.resolvedPersons[scored.targetEntityId]
  if (person) {
    metadata.personName = person.name
  }

  const reasoned: ReasonedFinding = {
    fingerprint: scored.fingerprint,
    findingType: scored.findingType as FleetGraphV2SuspectType,
    title: template.title(metadata),
    explanation: template.explanation(metadata),
    targetEntity: {
      id: scored.targetEntityId,
      type: scored.targetEntityType,
      name: entity?.title ?? scored.targetEntityId,
    },
    affectedPerson: person ? { id: person.id, name: person.name } : undefined,
    severity: scored.severity,
  }

  // Build proposed action if template has one
  let action: ProposedAction | undefined
  if (template.action) {
    const path = template.action.pathTemplate
      .replace('{entityId}', scored.targetEntityId)
      .replace('{entityType}', scored.targetEntityType)

    action = {
      findingFingerprint: scored.fingerprint,
      label: template.action.label,
      endpoint: {
        method: template.action.method,
        path,
      },
      targetEntity: reasoned.targetEntity,
      requiresApproval: template.action.requiresApproval,
      rollbackFeasibility: 'easy',
      safetyRationale: `This action is a standard ${scored.targetEntityType} operation with clear rollback path.`,
    }
  }

  return { reasoned, action }
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Reasons about scored findings to produce human-readable explanations.
 *
 * In V1, this uses template-based reasoning. Future versions will
 * integrate with an actual LLM for more nuanced explanations.
 *
 * @param state - Current graph state with scored findings
 * @param deps - Dependencies including optional LLM
 * @returns State update with reasoned findings and proposed actions
 */
export async function reasonFindings(
  state: FleetGraphStateV2,
  _deps: ReasonFindingsDeps = {}
): Promise<FleetGraphStateV2Update> {
  const reasonedFindings: ReasonedFinding[] = []
  const proposedActions: ProposedAction[] = []

  // Only process non-suppressed findings above threshold
  const qualifyingFindings = state.scoredFindings.filter(
    (f) => !f.suppressed && f.compositeScore >= 30
  )

  for (const scored of qualifyingFindings) {
    const { reasoned, action } = reasonFinding(scored, state)
    reasonedFindings.push(reasoned)
    if (action) {
      proposedActions.push(action)
    }
  }

  return {
    reasonedFindings,
    proposedActions,
    path: ['reason_findings'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type ReasonFindingsRoute = 'policy_gate'

/**
 * Always routes to policy_gate after reasoning.
 */
export function routeFromReasonFindings(
  _state: FleetGraphStateV2
): ReasonFindingsRoute {
  return 'policy_gate'
}
