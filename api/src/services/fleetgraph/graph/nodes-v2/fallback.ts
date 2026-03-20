import { logFleetGraph } from '../../logging.js'
import type {
  FleetGraphV2FallbackStage,
  ResponsePayload,
  TraceMetadata,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

export type FallbackRoute = 'persist_run_state'

function buildDisclaimer(
  stage: FleetGraphV2FallbackStage,
  state: FleetGraphStateV2
) {
  const authError = state.fetchErrors.find(
    (entry) => entry.statusCode === 401 || entry.statusCode === 403
  )
  const rateLimitError = state.fetchErrors.find(
    (entry) => entry.statusCode === 429
  )

  if (stage === 'input') {
    return 'FleetGraph could not determine enough Ship context to analyze this request.'
  }

  if (stage === 'fetch') {
    if (authError) {
      return 'Unable to access Ship data. Please check your authentication.'
    }
    if (rateLimitError) {
      return 'Ship API is temporarily rate limited. Please try again in a moment.'
    }
    return 'Some Ship data was unavailable, so this answer may be incomplete.'
  }

  return 'FleetGraph gathered context, but could not finish the analysis reliably.'
}

function buildPartialAnswer(
  stage: FleetGraphV2FallbackStage,
  state: FleetGraphStateV2
) {
  switch (stage) {
    case 'input':
      return {
        text: `I couldn't determine enough context to analyze this ${state.documentType ?? 'document'}.`,
        entityLinks: [],
        suggestedNextSteps: ['Refresh the page context', 'Open a specific Ship document first'],
      }
    case 'fetch':
      return {
        text: `I wasn't able to fully analyze this ${state.documentType ?? 'document'} due to data access issues.`,
        entityLinks: [],
        suggestedNextSteps: ['Try refreshing the page', 'Check your connection'],
      }
    case 'scoring':
    default:
      return {
        text: `I gathered context for this ${state.documentType ?? 'document'}, but I could not finish scoring it safely.`,
        entityLinks: [],
        suggestedNextSteps: ['Try again in a moment', 'Refresh the page to rerun the analysis'],
      }
  }
}

function buildFallback(
  stage: FleetGraphV2FallbackStage,
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  const disclaimer = buildDisclaimer(stage, state)
  let responsePayload: ResponsePayload

  if (state.mode === 'on_demand') {
    responsePayload = {
      type: 'degraded',
      disclaimer,
      partialAnswer: buildPartialAnswer(stage, state),
    }
  } else {
    responsePayload = { type: 'empty' }
  }

  logFleetGraph('warn', `fallback:${stage}`, {
    branch: 'fallback',
    disclaimer,
    documentId: state.documentId,
    documentType: state.documentType,
    fallbackReason: state.fallbackReason,
    fallbackStage: stage,
    fetchErrors: state.fetchErrors.map((entry) => ({
      endpoint: entry.endpoint,
      message: entry.message,
      retryCount: entry.retryCount,
      statusCode: entry.statusCode,
    })),
    mode: state.mode,
    partialData: state.partialData,
    path: state.path,
    runId: state.runId,
    threadId: state.threadId,
    workspaceId: state.workspaceId,
  })

  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    branch: 'fallback',
    fallbackStage: stage,
    completedAt: new Date().toISOString(),
  }

  return {
    branch: 'fallback',
    fallbackStage: stage,
    responsePayload,
    traceMetadata,
    path: [`fallback_${stage}`],
  }
}

export function fallbackInput(state: FleetGraphStateV2): FleetGraphStateV2Update {
  return buildFallback('input', state)
}

export function fallbackFetch(state: FleetGraphStateV2): FleetGraphStateV2Update {
  return buildFallback('fetch', state)
}

export function fallbackScoring(state: FleetGraphStateV2): FleetGraphStateV2Update {
  return buildFallback('scoring', state)
}

export function routeFromFallbackInput(
  _state: FleetGraphStateV2
): FallbackRoute {
  return 'persist_run_state'
}

export function routeFromFallbackFetch(
  _state: FleetGraphStateV2
): FallbackRoute {
  return 'persist_run_state'
}

export function routeFromFallbackScoring(
  _state: FleetGraphStateV2
): FallbackRoute {
  return 'persist_run_state'
}
