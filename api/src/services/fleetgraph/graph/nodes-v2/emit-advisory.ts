import type {
  ChatAnswer,
  InsightCard,
  ResponsePayload,
  TraceMetadata,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

function buildContextSummary(history: FleetGraphStateV2['conversationHistory']) {
  if (history.length <= 6) {
    return null
  }

  const olderTurns = history.slice(0, -3)
  return olderTurns
    .map((turn) => `${turn.role}: ${turn.content.slice(0, 100)}`)
    .join('\n')
}

function buildUpdatedConversation(state: FleetGraphStateV2, assistantText: string) {
  const userTurn = state.userQuestion
    ? [{
        content: state.userQuestion,
        role: 'user' as const,
        timestamp: new Date().toISOString(),
      }]
    : []

  const assistantTurn = {
    content: assistantText,
    role: 'assistant' as const,
    timestamp: new Date().toISOString(),
  }

  const conversationHistory = [
    ...state.conversationHistory,
    ...userTurn,
    assistantTurn,
  ]

  return {
    contextSummary: buildContextSummary(conversationHistory),
    conversationHistory,
    turnCount: state.turnCount + 1,
  }
}

function formatInsightCards(state: FleetGraphStateV2): InsightCard[] {
  return (state.reasonedFindings ?? []).map((finding) => {
    const action = state.actionDrafts.find(
      (draft) => draft.contextHints?.findingFingerprint === finding.fingerprint
    )

    const actionButtons: InsightCard['actionButtons'] = [
      { label: 'Snooze', action: 'snooze' },
      { label: 'Dismiss', action: 'dismiss' },
      { label: 'View Evidence', action: 'view_evidence' },
    ]

    if (action) {
      actionButtons.unshift({
        action: 'apply',
        label: action.actionType === 'start_week' ? 'Start week' : 'Review action',
        requiresApproval: true,
      })
    }

    return {
      actionButtons,
      body: finding.explanation,
      findingFingerprint: finding.fingerprint,
      id: finding.fingerprint,
      severityBadge: finding.severity,
      targetPerson: finding.affectedPerson,
      title: finding.title,
    }
  })
}

function formatChatAnswer(state: FleetGraphStateV2): ChatAnswer {
  const findings = state.reasonedFindings ?? []
  const text = state.analysisNarrative
    ?? (findings[0]
      ? `${findings[0].title}. ${findings[0].explanation}`
      : `I analyzed this ${state.documentType ?? 'document'} and did not find anything that needs immediate attention.`)

  const entityLinks = findings.map((finding) => ({
    id: finding.targetEntity.id,
    type: finding.targetEntity.type,
    name: finding.targetEntity.name,
  }))

  return {
    entityLinks,
    relatedContextSummary: state.contextSummary ?? undefined,
    suggestedNextSteps: state.actionDrafts.map((draft) => draft.actionType),
    text,
  }
}

export function emitAdvisory(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  let responsePayload: ResponsePayload
  let conversationUpdate: Pick<
    FleetGraphStateV2Update,
    'contextSummary' | 'conversationHistory' | 'turnCount'
  > = {}

  if (state.mode === 'on_demand') {
    const answer = formatChatAnswer(state)
    responsePayload = {
      type: 'chat_answer',
      answer,
    }
    conversationUpdate = buildUpdatedConversation(state, answer.text)
  } else {
    const cards = formatInsightCards(state)
    responsePayload = cards.length > 0
      ? { type: 'insight_cards', cards }
      : { type: 'empty' }
  }

  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    approvalRequired: false,
    branch: 'advisory',
    candidateCount: state.candidateFindings.length,
    completedAt: new Date().toISOString(),
    findingTypes: (state.reasonedFindings ?? []).map(
      (finding) => finding.findingType
    ) as TraceMetadata['findingTypes'],
  }

  return {
    ...conversationUpdate,
    path: ['emit_advisory'],
    responsePayload,
    traceMetadata,
  }
}

export type EmitAdvisoryRoute = 'persist_run_state'

export function routeFromEmitAdvisory(
  _state: FleetGraphStateV2
): EmitAdvisoryRoute {
  return 'persist_run_state'
}
