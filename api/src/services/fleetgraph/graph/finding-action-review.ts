import type {
  FleetGraphRuntimeInput,
  FleetGraphScenarioResult,
} from './types.js'

function buildQuietResult(): FleetGraphScenarioResult {
  return {
    branch: 'quiet',
    evidence: [],
    metadata: {},
    scenario: 'finding_action_review',
    score: 0,
  }
}

export function runFindingActionReviewScenario(
  state: FleetGraphRuntimeInput
): FleetGraphScenarioResult {
  if (!state.findingId || !state.requestedAction) {
    return buildQuietResult()
  }

  return {
    branch: 'approval_required',
    documentId: state.documentId,
    documentType: state.documentType,
    evidence: state.requestedAction.evidence,
    findingId: state.findingId,
    metadata: {},
    recommendedAction: state.requestedAction,
    scenario: 'finding_action_review',
    score: 1,
    summary: state.requestedAction.summary,
    title: state.requestedAction.title,
  }
}
