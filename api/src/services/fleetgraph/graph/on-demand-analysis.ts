import type { FleetGraphRuntimeInput, FleetGraphScenarioResult } from './types.js'

export function runOnDemandAnalysisScenario(
  state: FleetGraphRuntimeInput
): FleetGraphScenarioResult {
  if (!state.documentId || !state.documentType) {
    return {
      branch: 'quiet',
      evidence: [],
      metadata: {},
      scenario: 'on_demand_analysis',
      score: 0,
    }
  }

  return {
    branch: 'reasoned',
    documentId: state.documentId,
    documentType: state.documentType,
    evidence: [],
    metadata: { routeSurface: state.routeSurface },
    scenario: 'on_demand_analysis',
    score: 1,
  }
}
