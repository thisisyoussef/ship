/**
 * reason_findings - Shared Pipeline (Advisory + Action Branches)
 *
 * Lane: Shared
 * Type: LLM reasoning (with template fallback)
 * LLM: **Yes** - this is the first (and often only) LLM call in the graph
 *
 * For each scored finding, produces:
 * - 1-3 sentence explanation of why the human should care right now
 * - Names specific person, entity, and deadline involved
 * - Proposes concrete next action with requires_approval flag
 *
 * Two modes:
 * 1. Template-only (no LLM): Fast, deterministic explanations from templates
 * 2. LLM-enhanced (with LLM): Templates provide structure, LLM personalizes
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
import type { LLMAdapter } from '../../llm/types.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface ReasonFindingsDeps {
  llm?: LLMAdapter
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
// LLM Prompt
// ──────────────────────────────────────────────────────────────────────────────

const LLM_SYSTEM_INSTRUCTIONS = `You are FleetGraph, a project intelligence agent for Ship — a project management tool.

You enhance structured findings with personalized, context-aware explanations. You receive pre-detected findings with template explanations and improve them.

RESPONSE FORMAT: You MUST respond with valid JSON matching this schema:
{
  "findings": [
    {
      "fingerprint": "string — MUST match the input fingerprint exactly",
      "enhancedTitle": "string — improved title (or null to keep original)",
      "enhancedExplanation": "string — 2-3 sentence personalized explanation",
      "additionalContext": "string — optional extra insight based on the data",
      "suggestedAction": null or {
        "actionType": "start_week | approve_week_plan | approve_project_plan | assign_owner | assign_issues | post_comment | escalate_risk | rebalance_load | post_standup",
        "label": "string — button label",
        "rationale": "string — why this action helps"
      }
    }
  ],
  "overallAnalysis": "string — 1-2 sentence summary of all findings together"
}

GUIDELINES:
- Keep explanations concise but specific — name people, dates, and numbers
- Focus on "why should I care right now" not just "what is the issue"
- If the finding already has a good action, don't suggest a different one
- Only suggest actions from the supported list above
- If data is missing, say so rather than guessing
- Be direct and actionable, not vague`

function buildLLMInput(
  templateFindings: Array<{ reasoned: ReasonedFinding; action?: ProposedAction }>,
  state: FleetGraphStateV2
): string {
  const parts: string[] = []

  // Context
  parts.push(`## Context
- Mode: ${state.mode}
- Document: ${state.documentId ?? 'workspace-wide'} (${state.documentType ?? 'multiple'})
- Actor Role: ${state.roleLens ?? 'unknown'}`)

  // Findings to enhance
  parts.push(`## Findings to Enhance`)
  for (const { reasoned, action } of templateFindings) {
    parts.push(`
### Finding: ${reasoned.fingerprint}
- Type: ${reasoned.findingType}
- Severity: ${reasoned.severity}
- Target: ${reasoned.targetEntity.name} (${reasoned.targetEntity.type})
- Template Title: ${reasoned.title}
- Template Explanation: ${reasoned.explanation}
${reasoned.affectedPerson ? `- Affected Person: ${reasoned.affectedPerson.name}` : ''}
${action ? `- Current Action: ${action.label} (${action.endpoint.method} ${action.endpoint.path})` : '- No action proposed'}`)
  }

  // Available data summary
  if (state.normalizedContext) {
    const nodeTypes = state.normalizedContext.nodes.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    parts.push(`
## Available Data
- Nodes: ${JSON.stringify(nodeTypes)}
- People resolved: ${Object.keys(state.normalizedContext.resolvedPersons).length}`)
  }

  return parts.join('\n')
}

interface LLMEnhancedFinding {
  fingerprint: string
  enhancedTitle?: string | null
  enhancedExplanation: string
  additionalContext?: string
  suggestedAction?: {
    actionType: string
    label: string
    rationale: string
  } | null
}

interface LLMResponse {
  findings: LLMEnhancedFinding[]
  overallAnalysis?: string
}

function parseLLMResponse(text: string): LLMResponse | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()

  try {
    return JSON.parse(cleaned) as LLMResponse
  } catch {
    console.warn('[FleetGraph V2] Failed to parse LLM response as JSON')
    return null
  }
}

function applyLLMEnhancements(
  templateFindings: Array<{ reasoned: ReasonedFinding; action?: ProposedAction }>,
  llmResponse: LLMResponse
): Array<{ reasoned: ReasonedFinding; action?: ProposedAction }> {
  const enhanced: Array<{ reasoned: ReasonedFinding; action?: ProposedAction }> = []

  for (const { reasoned, action } of templateFindings) {
    const llmFinding = llmResponse.findings.find(f => f.fingerprint === reasoned.fingerprint)

    if (llmFinding) {
      // Apply enhancements
      const enhancedReasoned: ReasonedFinding = {
        ...reasoned,
        title: llmFinding.enhancedTitle ?? reasoned.title,
        explanation: llmFinding.enhancedExplanation || reasoned.explanation,
      }

      // If LLM suggests an action and we don't have one, consider adding it
      let enhancedAction = action
      if (!action && llmFinding.suggestedAction) {
        const actionConfig = getActionConfig(llmFinding.suggestedAction.actionType)
        if (actionConfig) {
          enhancedAction = {
            findingFingerprint: reasoned.fingerprint,
            label: llmFinding.suggestedAction.label,
            endpoint: {
              method: actionConfig.method,
              path: actionConfig.pathTemplate.replace('{entityId}', reasoned.targetEntity.id),
            },
            targetEntity: reasoned.targetEntity,
            requiresApproval: true,
            rollbackFeasibility: 'easy',
            safetyRationale: llmFinding.suggestedAction.rationale,
          }
        }
      }

      enhanced.push({ reasoned: enhancedReasoned, action: enhancedAction })
    } else {
      // Keep original if LLM didn't provide enhancement
      enhanced.push({ reasoned, action })
    }
  }

  return enhanced
}

const ACTION_CONFIGS: Record<string, { method: 'POST' | 'PATCH'; pathTemplate: string }> = {
  start_week: { method: 'POST', pathTemplate: '/api/weeks/{entityId}/start' },
  approve_week_plan: { method: 'POST', pathTemplate: '/api/weeks/{entityId}/approve-plan' },
  approve_project_plan: { method: 'POST', pathTemplate: '/api/projects/{entityId}/approve-plan' },
  assign_owner: { method: 'PATCH', pathTemplate: '/api/documents/{entityId}' },
  assign_issues: { method: 'PATCH', pathTemplate: '/api/documents/{entityId}' },
  post_comment: { method: 'POST', pathTemplate: '/api/documents/{entityId}/comments' },
  escalate_risk: { method: 'POST', pathTemplate: '/api/documents/{entityId}/comments' },
  rebalance_load: { method: 'PATCH', pathTemplate: '/api/documents/{entityId}' },
  post_standup: { method: 'POST', pathTemplate: '/api/standups' },
}

function getActionConfig(actionType: string) {
  return ACTION_CONFIGS[actionType]
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Reasons about scored findings to produce human-readable explanations.
 *
 * Two modes:
 * 1. Template-only (no LLM): Fast, deterministic explanations from templates
 * 2. LLM-enhanced (with LLM): Templates provide structure, LLM personalizes
 *
 * @param state - Current graph state with scored findings
 * @param deps - Dependencies including optional LLM
 * @returns State update with reasoned findings and proposed actions
 */
export async function reasonFindings(
  state: FleetGraphStateV2,
  deps: ReasonFindingsDeps = {}
): Promise<FleetGraphStateV2Update> {
  // Only process non-suppressed findings above threshold
  const qualifyingFindings = state.scoredFindings.filter(
    (f) => !f.suppressed && f.compositeScore >= 30
  )

  // Step 1: Generate template-based findings
  const templateFindings: Array<{ reasoned: ReasonedFinding; action?: ProposedAction }> = []
  for (const scored of qualifyingFindings) {
    templateFindings.push(reasonFinding(scored, state))
  }

  // Step 2: If LLM available, enhance with personalized explanations
  let finalFindings = templateFindings

  if (deps.llm && templateFindings.length > 0) {
    try {
      const input = buildLLMInput(templateFindings, state)
      const response = await deps.llm.generate({
        instructions: LLM_SYSTEM_INSTRUCTIONS,
        input,
        maxOutputTokens: 2000,
        temperature: 0.3,
      })

      const parsed = parseLLMResponse(response.text)
      if (parsed) {
        finalFindings = applyLLMEnhancements(templateFindings, parsed)
      }
    } catch (error) {
      console.warn('[FleetGraph V2] LLM enhancement failed, using template fallback:', error)
      // Keep template findings on error
    }
  }

  // Step 3: Extract results
  const reasonedFindings: ReasonedFinding[] = []
  const proposedActions: ProposedAction[] = []

  for (const { reasoned, action } of finalFindings) {
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
