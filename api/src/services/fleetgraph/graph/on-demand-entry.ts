import type {
  FleetGraphRuntimeInput,
  FleetGraphScenarioResult,
} from './types.js'

function buildQuietResult(): FleetGraphScenarioResult {
  return {
    branch: 'quiet',
    evidence: [],
    metadata: {},
    scenario: 'entry_context_check',
    score: 0,
  }
}

export function runOnDemandEntryScenario(
  state: FleetGraphRuntimeInput
): FleetGraphScenarioResult {
  if (state.requestedAction) {
    return {
      branch: 'approval_required',
      documentId: state.documentId,
      documentType: state.documentType,
      evidence: state.requestedAction.evidence,
      metadata: {},
      recommendedAction: state.requestedAction,
      scenario: 'entry_requested_action',
      score: 1,
      summary: state.requestedAction.summary,
      title: state.requestedAction.title,
    }
  }

  if (!state.documentId || !state.documentTitle) {
    return buildQuietResult()
  }

  return {
    branch: 'reasoned',
    documentId: state.documentId,
    documentType: state.documentType,
    evidence: [
      `FleetGraph has current Ship context for ${state.documentTitle}.`,
      'No write action is being requested from this page state.',
    ],
    metadata: {
      routeSurface: state.routeSurface,
    },
    scenario: 'entry_context_check',
    score: 0.35,
    summary: `FleetGraph reviewed ${state.documentTitle} and can help from this page.`,
    title: 'FleetGraph is ready in this context.',
  }
}
