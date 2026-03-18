/**
 * emit_advisory - Shared Pipeline (Advisory Delivery)
 *
 * Lane: Shared
 * Type: Output formatter
 * LLM: No
 *
 * Formats findings into the appropriate delivery shape:
 * - Proactive insight card: Title, body, severity badge, action buttons
 * - On-demand chat answer: Natural language with entity links
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type {
  ChatAnswer,
  InsightCard,
  ResponsePayload,
  TraceMetadata,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Formatting Functions
// ──────────────────────────────────────────────────────────────────────────────

function formatInsightCards(state: FleetGraphStateV2): InsightCard[] {
  const cards: InsightCard[] = []

  for (const finding of state.reasonedFindings ?? []) {
    const action = state.proposedActions.find(
      (a) => a.findingFingerprint === finding.fingerprint
    )

    const actionButtons: InsightCard['actionButtons'] = [
      { label: 'Snooze', action: 'snooze' },
      { label: 'Dismiss', action: 'dismiss' },
      { label: 'View Evidence', action: 'view_evidence' },
    ]

    // Add apply button if there's an action
    if (action) {
      actionButtons.unshift({
        label: action.label,
        action: 'apply',
        requiresApproval: action.requiresApproval,
      })
    }

    cards.push({
      id: finding.fingerprint,
      findingFingerprint: finding.fingerprint,
      title: finding.title,
      body: finding.explanation,
      severityBadge: finding.severity,
      targetPerson: finding.affectedPerson,
      actionButtons,
    })
  }

  return cards
}

function formatChatAnswer(state: FleetGraphStateV2): ChatAnswer {
  const findings = state.reasonedFindings ?? []

  // Build natural language response
  let text: string
  if (findings.length === 0) {
    text = state.userQuestion
      ? `I analyzed this ${state.documentType ?? 'document'} and didn't find any immediate issues to flag.`
      : `No issues found for this ${state.documentType ?? 'document'}.`
  } else {
    const summaries = findings.map((f) => `• **${f.title}**: ${f.explanation}`)
    text = `Here's what I found:\n\n${summaries.join('\n\n')}`
  }

  // Build entity links
  const entityLinks = findings.map((f) => ({
    id: f.targetEntity.id,
    type: f.targetEntity.type,
    name: f.targetEntity.name,
  }))

  // Build suggested next steps
  const suggestedNextSteps = state.proposedActions.map((a) => a.label)

  return {
    text,
    entityLinks,
    suggestedNextSteps,
    relatedContextSummary: state.normalizedContext
      ? `Analyzed ${state.normalizedContext.nodes.length} entities`
      : undefined,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Formats findings for advisory delivery.
 *
 * @param state - Current graph state with reasoned findings
 * @returns State update with response payload
 */
export function emitAdvisory(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  let responsePayload: ResponsePayload

  if (state.mode === 'on_demand') {
    // On-demand: chat answer format
    responsePayload = {
      type: 'chat_answer',
      answer: formatChatAnswer(state),
    }
  } else {
    // Proactive: insight cards format
    const cards = formatInsightCards(state)
    responsePayload = cards.length > 0
      ? { type: 'insight_cards', cards }
      : { type: 'empty' }
  }

  // Update trace metadata
  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    branch: 'advisory',
    candidateCount: state.candidateFindings.length,
    findingTypes: (state.reasonedFindings ?? []).map(
      (f) => f.findingType
    ) as TraceMetadata['findingTypes'],
    approvalRequired: false,
    completedAt: new Date().toISOString(),
  }

  return {
    responsePayload,
    traceMetadata,
    path: ['emit_advisory'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type EmitAdvisoryRoute = 'persist_run_state'

/**
 * Always routes to persist_run_state after advisory emission.
 */
export function routeFromEmitAdvisory(
  _state: FleetGraphStateV2
): EmitAdvisoryRoute {
  return 'persist_run_state'
}
