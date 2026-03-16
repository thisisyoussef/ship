import { Annotation } from '@langchain/langgraph';

import type {
  FleetGraphBranch,
  FleetGraphMode,
  FleetGraphOutcome,
  FleetGraphTrigger,
} from './types.js';

function replaceValue<T>(defaultValue: T) {
  return Annotation<T>({
    default: () => defaultValue,
    reducer: (_left, right) => right,
  });
}

function appendPath() {
  return Annotation<string[], string | string[]>({
    default: () => [],
    reducer: (left, right) =>
      left.concat(Array.isArray(right) ? right : [right]),
  });
}

export const FleetGraphStateAnnotation = Annotation.Root({
  approvalRequired: replaceValue(false),
  branch: replaceValue<FleetGraphBranch>('fallback'),
  candidateCount: replaceValue(0),
  checkpointNamespace: replaceValue('fleetgraph'),
  documentId: replaceValue<string | undefined>(undefined),
  hasError: replaceValue(false),
  mode: replaceValue<FleetGraphMode>('proactive'),
  outcome: replaceValue<FleetGraphOutcome>('fallback'),
  path: appendPath(),
  routeSurface: replaceValue('workspace-sweep'),
  threadId: replaceValue(''),
  trigger: replaceValue<FleetGraphTrigger>('scheduled-sweep'),
  workspaceId: replaceValue(''),
});

export type FleetGraphGraphState =
  typeof FleetGraphStateAnnotation.State;

