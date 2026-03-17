import { Annotation } from '@langchain/langgraph'

import type { FleetGraphRequestedAction } from '../contracts/actions.js'
import type {
  FleetGraphActionOutcomeStatus,
  FleetGraphBranch,
  FleetGraphMode,
  FleetGraphOutcome,
  FleetGraphRunContext,
  FleetGraphScenario,
  FleetGraphScenarioResult,
  FleetGraphTrigger,
} from './types.js'

function replaceValue<T>(defaultValue: T) {
  return Annotation<T>({
    default: () => defaultValue,
    reducer: (_left, right) => right,
  })
}

function appendPath() {
  return Annotation<string[], string | string[]>({
    default: () => [],
    reducer: (left, right) =>
      left.concat(Array.isArray(right) ? right : [right]),
  })
}

function appendScenarioResults() {
  return Annotation<FleetGraphScenarioResult[], FleetGraphScenarioResult | FleetGraphScenarioResult[]>({
    default: () => [],
    reducer: (left, right) =>
      left.concat(Array.isArray(right) ? right : [right]),
  })
}

export const FleetGraphStateAnnotation = Annotation.Root({
  approvalRequired: replaceValue(false),
  actionOutcome: replaceValue<
    | {
      message: string
      resultStatusCode?: number
      status: FleetGraphActionOutcomeStatus
    }
    | undefined
  >(undefined),
  activeScenario: replaceValue<FleetGraphScenario | undefined>(undefined),
  branch: replaceValue<FleetGraphBranch>('fallback'),
  candidateCount: replaceValue(0),
  checkpointNamespace: replaceValue('fleetgraph'),
  contextKind: replaceValue<FleetGraphRunContext>('proactive'),
  documentId: replaceValue<string | undefined>(undefined),
  documentTitle: replaceValue<string | undefined>(undefined),
  documentType: replaceValue<string | undefined>(undefined),
  findingId: replaceValue<string | undefined>(undefined),
  hasError: replaceValue(false),
  mode: replaceValue<FleetGraphMode>('proactive'),
  outcome: replaceValue<FleetGraphOutcome>('fallback'),
  path: appendPath(),
  requestedAction: replaceValue<FleetGraphRequestedAction | undefined>(undefined),
  routeSurface: replaceValue('workspace-sweep'),
  scenarioResults: appendScenarioResults(),
  selectedAction: replaceValue<FleetGraphRequestedAction | undefined>(undefined),
  selectedFindingId: replaceValue<string | undefined>(undefined),
  selectedScenario: replaceValue<FleetGraphScenario | undefined>(undefined),
  threadId: replaceValue(''),
  trigger: replaceValue<FleetGraphTrigger>('scheduled-sweep'),
  workspaceId: replaceValue(''),
})

export type FleetGraphGraphState =
  typeof FleetGraphStateAnnotation.State
