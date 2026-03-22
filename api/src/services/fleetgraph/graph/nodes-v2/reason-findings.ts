/**
 * reason_findings - Shared Pipeline (Advisory + Action Branches)
 *
 * Lane: Shared
 * Type: LLM reasoning (with template fallback)
 * LLM: Yes
 *
 * This node converts scored findings into human-readable explanations, keeps
 * multi-turn on-demand context alive, and emits shared action-registry drafts
 * instead of V1-shaped review actions.
 */

import { actionDraftFromProposedAction } from '../../actions/drafts.js'
import type { LLMAdapter } from '../../llm/types.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'
import { buildFindingEvidence } from './finding-evidence.js'
import type {
  FleetGraphActionType,
  FleetGraphV2SuspectType,
  ProposedAction,
  ReasonedFinding,
  ScoredFinding,
} from '../types-v2.js'

export interface ReasonFindingsDeps {
  llm?: LLMAdapter
}

const FINDING_TEMPLATES: Record<FleetGraphV2SuspectType, {
  title: (metadata: Record<string, unknown>) => string
  explanation: (metadata: Record<string, unknown>) => string
  action?: {
    actionType: FleetGraphActionType
    label: string
    method: 'POST' | 'PATCH'
    pathTemplate: string
    requiresApproval: boolean
  }
}> = {
  week_start_drift: {
    title: (m) => `Week "${m.weekTitle ?? 'Untitled'}" is still in planning`,
    explanation: (m) => {
      const hours = Math.round((m.hoursSinceStart as number) ?? 0)
      return `This week started ${hours} hours ago but is still marked as planning. Starting it would unblock issue tracking and standup submission.`
    },
    action: {
      actionType: 'start_week',
      label: 'Start this week',
      method: 'POST',
      pathTemplate: '/api/weeks/{entityId}/start',
      requiresApproval: true,
    },
  },
  empty_active_week: {
    title: (m) => `Active week "${m.weekTitle ?? 'Untitled'}" has no issues`,
    explanation: () =>
      'This week is active but has no scoped issues, so the team may not have a concrete plan to execute against.',
  },
  missing_standup: {
    title: (m) => `${m.personName ?? 'A team member'} has not posted a standup`,
    explanation: (m) =>
      `${m.personName ?? 'This person'} still has active work but no standup update today, which reduces visibility for the rest of the team.`,
  },
  approval_gap: {
    title: (m) => `${m.entityTitle ?? 'A submission'} needs review`,
    explanation: (m) => {
      const days = Math.round((m.businessDaysSinceSubmission as number) ?? 0)
      return `This ${m.entityType ?? 'item'} has been waiting ${days} business day(s) for approval, so the owner may be blocked on the next step.`
    },
    action: {
      actionType: 'approve_week_plan',
      label: 'Review and approve',
      method: 'POST',
      pathTemplate: '/api/{entityType}s/{entityId}/approve-plan',
      requiresApproval: true,
    },
  },
  deadline_risk: {
    title: (m) => `Project "${m.projectTitle ?? 'Untitled'}" deadline at risk`,
    explanation: (m) => {
      const days = Math.round((m.daysUntil as number) ?? 0)
      const issues = Math.round((m.openIssueCount as number) ?? 0)
      const staleNote = m.hasStaleHighPriority ? ' At least one high-priority issue is stale.' : ''
      return `The target date is ${days} day(s) away with ${issues} open issues.${staleNote}`
    },
  },
  workload_imbalance: {
    title: (m) => `${m.personName ?? 'A team member'} may be overloaded`,
    explanation: (m) => {
      const percent = Math.round((((m.percentOfTotal as number) ?? 0)) * 100)
      return `This person is carrying about ${percent}% of the visible open work estimate, which is a signal to rebalance assignments.`
    },
  },
  blocker_aging: {
    title: (m) => `Issue "${m.issueTitle ?? 'Untitled'}" has an aging blocker`,
    explanation: (m) => {
      const days = Math.round((m.businessDaysSinceUpdate as number) ?? 0)
      return `This blocker has gone ${days} business day(s) without a meaningful update, so the issue may need escalation or reassignment.`
    },
  },
  sprint_no_owner: {
    title: (m) => `Week "${m.weekTitle ?? 'Untitled'}" has no owner`,
    explanation: () =>
      'This week has no owner assigned, so nobody is accountable for driving execution and daily standups.',
    action: {
      actionType: 'assign_owner',
      label: 'Assign an owner',
      method: 'PATCH',
      pathTemplate: '/api/documents/{entityId}',
      requiresApproval: true,
    },
  },
  unassigned_sprint_issues: {
    title: (m) => {
      const count = Math.round((m.unassignedCount as number) ?? 0)
      return `${count} unassigned issues in "${m.weekTitle ?? 'Untitled'}"`
    },
    explanation: (m) => {
      const count = Math.round((m.unassignedCount as number) ?? 0)
      const total = Math.round((m.totalCount as number) ?? 0)
      return `${count} of ${total} issues in this week have no assignee. Assigning issues helps the team stay focused and accountable.`
    },
    action: {
      actionType: 'assign_issues',
      label: 'Assign issues',
      method: 'PATCH',
      pathTemplate: '/api/documents/{entityId}',
      requiresApproval: true,
    },
  },
}

const ACTION_CONFIGS: Record<FleetGraphActionType, { method: 'POST' | 'PATCH'; pathTemplate: string }> = {
  start_week: { method: 'POST', pathTemplate: '/api/weeks/{entityId}/start' },
  approve_week_plan: { method: 'POST', pathTemplate: '/api/weeks/{entityId}/approve-plan' },
  approve_project_plan: { method: 'POST', pathTemplate: '/api/projects/{entityId}/approve-plan' },
  assign_owner: { method: 'PATCH', pathTemplate: '/api/documents/{entityId}' },
  assign_issues: { method: 'PATCH', pathTemplate: '/api/documents/{entityId}' },
  post_comment: { method: 'POST', pathTemplate: '/api/documents/{entityId}/comments' },
  post_standup: { method: 'POST', pathTemplate: '/api/standups' },
  escalate_risk: { method: 'POST', pathTemplate: '/api/documents/{entityId}/comments' },
  rebalance_load: { method: 'PATCH', pathTemplate: '/api/documents/{entityId}' },
}

const LLM_SYSTEM_INSTRUCTIONS = `You are FleetGraph, a project intelligence agent for Ship.

You improve structured findings and answer follow-up questions about the current document.

Return valid JSON:
{
  "findings": [
    {
      "fingerprint": "string",
      "enhancedTitle": "string | null",
      "enhancedExplanation": "string",
      "suggestedAction": null or {
        "actionType": "start_week | approve_week_plan | approve_project_plan | assign_owner | assign_issues | post_comment | post_standup | escalate_risk | rebalance_load",
        "label": "string",
        "rationale": "string"
      }
    }
  ],
  "overallAnalysis": "string"
}

Guidelines:
- Keep the answer concise and specific.
- When there is a user question, answer it directly first.
- Use only grounded facts from the provided context.
- If there are no important issues, say that plainly.
- Do not invent people, dates, or entities.

## Role-Aware Reasoning
Your analysis should be tailored to the user's role:

**Director lens:** Focus on cross-project risks, resource allocation, strategic blockers, and escalation decisions. Highlight what needs executive attention vs what teams can handle. Be concise — directors need summaries, not details.

**PM lens:** Focus on sprint health, approval gaps, workload balance, and delivery risk. Suggest concrete actions: reassign work, approve plans, escalate blockers. Include timeline and ownership details.

**Engineer lens:** Focus on immediate blockers, task priorities, and next actions for assigned work. Be specific about what to do next. Reference issue titles and sprint context directly.

If role lens is 'unknown', default to PM-style analysis.`

interface LLMEnhancedFinding {
  fingerprint: string
  enhancedExplanation: string
  enhancedTitle?: string | null
  suggestedAction?: {
    actionType: FleetGraphActionType
    label: string
    rationale: string
  } | null
}

interface LLMResponse {
  findings: LLMEnhancedFinding[]
  overallAnalysis?: string
}

function buildConversationContext(state: FleetGraphStateV2) {
  const recentTurns = state.conversationHistory.slice(-4)
  const sections: string[] = []

  if (recentTurns.length > 0) {
    sections.push(
      `## Recent Conversation\n${recentTurns.map((turn) => `${turn.role}: ${turn.content}`).join('\n')}`
    )
  }

  if (state.contextSummary) {
    sections.push(`## Earlier Context Summary\n${state.contextSummary}`)
  }

  if (state.userQuestion) {
    sections.push(`## User Question\n${state.userQuestion}`)
  }

  return sections.join('\n\n')
}

function reasonFinding(
  scored: ScoredFinding,
  state: FleetGraphStateV2
): { reasoned: ReasonedFinding; action?: ProposedAction } {
  const template = FINDING_TEMPLATES[scored.findingType as FleetGraphV2SuspectType]

  if (!template) {
    return {
      reasoned: {
        evidence: [
          `target_entity_id: ${scored.targetEntityId}`,
          `finding_type: ${scored.findingType}`,
        ],
        fingerprint: scored.fingerprint,
        findingType: scored.findingType as FleetGraphV2SuspectType,
        title: `Finding: ${scored.findingType}`,
        explanation: `A ${scored.findingType} signal was detected for entity ${scored.targetEntityId}.`,
        targetEntity: {
          id: scored.targetEntityId,
          type: scored.targetEntityType,
          name: scored.targetEntityId,
        },
        severity: scored.severity,
      },
    }
  }

  const metadata: Record<string, unknown> = { ...scored.rawData }
  const entity = state.normalizedContext?.nodes.find((node) => node.id === scored.targetEntityId)
  if (entity) {
    metadata.entityTitle = entity.title
    if (entity.type === 'week') metadata.weekTitle = entity.title
    if (entity.type === 'project') metadata.projectTitle = entity.title
    if (entity.type === 'issue') metadata.issueTitle = entity.title
    metadata.entityType = entity.type
  }

  const affectedPersonId = typeof metadata.personId === 'string'
    ? metadata.personId
    : (typeof scored.rawData.ownerId === 'string' ? scored.rawData.ownerId : null)
  const person = affectedPersonId
    ? state.normalizedContext?.resolvedPersons[affectedPersonId]
    : state.normalizedContext?.resolvedPersons[scored.targetEntityId]
  if (person) {
    metadata.personName = person.name
  }

  const reasoned: ReasonedFinding = {
    evidence: buildFindingEvidence(
      scored.findingType as FleetGraphV2SuspectType,
      scored,
      metadata,
    ),
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

  let action: ProposedAction | undefined
  if (template.action) {
    const actionType = template.action.actionType === 'approve_week_plan'
      && scored.targetEntityType === 'project'
      ? 'approve_project_plan'
      : template.action.actionType
    const path = template.action.pathTemplate
      .replace('{entityId}', scored.targetEntityId)
      .replace('{entityType}', scored.targetEntityType)

    action = {
      actionType,
      findingFingerprint: scored.fingerprint,
      label: template.action.label,
      endpoint: {
        method: template.action.method,
        path,
      },
      targetEntity: reasoned.targetEntity,
      requiresApproval: template.action.requiresApproval,
      rollbackFeasibility: 'easy',
      safetyRationale: `This is a standard ${actionType} Ship action on the current ${scored.targetEntityType}.`,
    }
  }

  return { reasoned, action }
}

function buildLLMInput(
  templateFindings: Array<{ reasoned: ReasonedFinding; action?: ProposedAction }>,
  state: FleetGraphStateV2
) {
  const parts = [
    `## Context
- Mode: ${state.mode}
- Document: ${state.documentId ?? 'workspace'} (${state.documentType ?? 'multiple'})
- Role lens: ${state.roleLens}`,
  ]

  const conversationContext = buildConversationContext(state)
  if (conversationContext) {
    parts.push(conversationContext)
  }

  if (templateFindings.length > 0) {
    parts.push('## Findings')
    for (const { reasoned, action } of templateFindings) {
      parts.push([
        `Fingerprint: ${reasoned.fingerprint}`,
        `Title: ${reasoned.title}`,
        `Explanation: ${reasoned.explanation}`,
        `Evidence: ${reasoned.evidence.join('; ')}`,
        action ? `Suggested action: ${action.label}` : 'Suggested action: none',
      ].join('\n'))
    }
  } else {
    parts.push('## Findings\nNo scored findings crossed the threshold. Answer the user based on the current document context.')
  }

  return parts.join('\n\n')
}

function parseLLMResponse(text: string): LLMResponse | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()

  try {
    return JSON.parse(cleaned) as LLMResponse
  } catch {
    return null
  }
}

function buildSuggestedAction(
  reasoned: ReasonedFinding,
  suggestedAction: NonNullable<LLMEnhancedFinding['suggestedAction']>
): ProposedAction | undefined {
  const config = ACTION_CONFIGS[suggestedAction.actionType]
  if (!config) {
    return undefined
  }

  return {
    actionType: suggestedAction.actionType,
    findingFingerprint: reasoned.fingerprint,
    label: suggestedAction.label,
    endpoint: {
      method: config.method,
      path: config.pathTemplate.replace('{entityId}', reasoned.targetEntity.id),
    },
    targetEntity: reasoned.targetEntity,
    requiresApproval: true,
    rollbackFeasibility: 'easy',
    safetyRationale: suggestedAction.rationale,
  }
}

function buildAnalysisNarrative(
  state: FleetGraphStateV2,
  findings: ReasonedFinding[],
  overallAnalysis?: string
) {
  if (overallAnalysis && overallAnalysis.trim().length > 0) {
    return overallAnalysis.trim()
  }

  if (state.userQuestion) {
    if (findings.length === 0) {
      return `I checked this ${state.documentType ?? 'document'} against your question and I do not see an immediate issue to flag right now.`
    }
    return `For your question, the most relevant signal is ${findings[0]?.title ?? 'the current document state'}. ${findings[0]?.explanation ?? ''}`.trim()
  }

  if (findings.length === 0) {
    return `I analyzed this ${state.documentType ?? 'document'} and did not find anything that needs immediate attention.`
  }

  if (findings.length === 1) {
    return `${findings[0]!.title}. ${findings[0]!.explanation}`
  }

  return `${findings[0]!.title} is the highest-priority signal right now. ${findings[0]!.explanation}`
}

export async function reasonFindings(
  state: FleetGraphStateV2,
  deps: ReasonFindingsDeps = {}
): Promise<FleetGraphStateV2Update> {
  const qualifyingFindings = state.scoredFindings.filter(
    (finding) => !finding.suppressed && finding.compositeScore >= 30
  )

  const templateFindings = qualifyingFindings.map((finding) => reasonFinding(finding, state))
  let enhancedFindings = templateFindings
  let overallAnalysis: string | undefined

  if (deps.llm && (templateFindings.length > 0 || Boolean(state.userQuestion))) {
    try {
      const response = await deps.llm.generate({
        instructions: LLM_SYSTEM_INSTRUCTIONS,
        input: buildLLMInput(templateFindings, state),
        maxOutputTokens: 1800,
        temperature: 0.2,
      })
      const parsed = parseLLMResponse(response.text)
      if (parsed) {
        overallAnalysis = parsed.overallAnalysis
        enhancedFindings = templateFindings.map(({ reasoned, action }) => {
          const match = parsed.findings.find((item) => item.fingerprint === reasoned.fingerprint)
          if (!match) {
            return { reasoned, action }
          }

          return {
            action: action ?? (match.suggestedAction
              ? buildSuggestedAction(reasoned, match.suggestedAction)
              : undefined),
            reasoned: {
              ...reasoned,
              explanation: match.enhancedExplanation || reasoned.explanation,
              title: match.enhancedTitle ?? reasoned.title,
            },
          }
        })
      }
    } catch (error) {
      console.warn('[FleetGraph V2] LLM reasoning failed, falling back to templates.', error)
    }
  }

  const reasonedFindings = enhancedFindings.map((entry) => entry.reasoned)
  const proposedActions = enhancedFindings
    .map((entry) => entry.action)
    .filter((value): value is ProposedAction => Boolean(value))
  const actionDrafts = proposedActions
    .map((action) => {
      const reasonedFinding = reasonedFindings.find(
        (finding) => finding.fingerprint === action.findingFingerprint
      )
      return reasonedFinding
        ? actionDraftFromProposedAction(action, reasonedFinding.evidence)
        : undefined
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
  const analysisNarrative = buildAnalysisNarrative(
    state,
    reasonedFindings,
    overallAnalysis,
  )

  return {
    actionDrafts,
    analysisNarrative,
    path: ['reason_findings'],
    proposedActions,
    reasonedFindings,
  }
}

export type ReasonFindingsRoute = 'policy_gate'

export function routeFromReasonFindings(
  _state: FleetGraphStateV2
): ReasonFindingsRoute {
  return 'policy_gate'
}
