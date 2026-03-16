import {
  END,
  MemorySaver,
  START,
  StateGraph,
} from '@langchain/langgraph';

import { FleetGraphStateAnnotation } from './state.js';
import {
  FleetGraphStateSchema,
  parseFleetGraphRuntimeInput,
  type FleetGraphBranch,
  type FleetGraphRuntimeInput,
  type FleetGraphState,
} from './types.js';

interface FleetGraphRuntime {
  readonly checkpointer: MemorySaver;
  getState(threadId: string): Promise<unknown>;
  invoke(input: unknown): Promise<FleetGraphState>;
}

interface FleetGraphRuntimeDeps {
  checkpointer?: MemorySaver;
}

const BRANCH_TO_NODE: Record<FleetGraphBranch, string> = {
  approval_required: 'approval_interrupt',
  fallback: 'fallback',
  quiet: 'quiet_exit',
  reasoned: 'reason_and_deliver',
};

function buildRouteSurface(input: FleetGraphRuntimeInput) {
  if (input.routeSurface) {
    return input.routeSurface;
  }

  return input.mode === 'on_demand'
    ? 'document-page'
    : 'workspace-sweep';
}

function selectBranch(input: FleetGraphRuntimeInput): FleetGraphBranch {
  if (input.hasError) {
    return 'fallback';
  }

  if (input.approvalRequired) {
    return 'approval_required';
  }

  if (input.mode === 'on_demand' || input.candidateCount > 0) {
    return 'reasoned';
  }

  return 'quiet';
}

function branchOutcome(branch: FleetGraphBranch): FleetGraphState['outcome'] {
  switch (branch) {
    case 'approval_required':
      return 'approval_required';
    case 'fallback':
      return 'fallback';
    case 'reasoned':
      return 'advisory';
    default:
      return 'quiet';
  }
}

function buildCompiledGraph(checkpointer: MemorySaver) {
  return new StateGraph(FleetGraphStateAnnotation)
    .addNode('resolve_trigger_context', (state) => ({
      checkpointNamespace: 'fleetgraph',
      path: 'resolve_trigger_context',
      routeSurface: state.routeSurface || 'workspace-sweep',
    }))
    .addNode('determine_branch', (state) => {
      const branch = selectBranch(state);
      return {
        branch,
        outcome: branchOutcome(branch),
        path: 'determine_branch',
      };
    })
    .addNode('quiet_exit', () => ({
      path: 'quiet_exit',
    }))
    .addNode('reason_and_deliver', () => ({
      path: 'reason_and_deliver',
    }))
    .addNode('approval_interrupt', () => ({
      path: 'approval_interrupt',
    }))
    .addNode('fallback', () => ({
      path: 'fallback',
    }))
    .addEdge(START, 'resolve_trigger_context')
    .addEdge('resolve_trigger_context', 'determine_branch')
    .addConditionalEdges('determine_branch', (state) => {
      return BRANCH_TO_NODE[state.branch];
    })
    .addEdge('quiet_exit', END)
    .addEdge('reason_and_deliver', END)
    .addEdge('approval_interrupt', END)
    .addEdge('fallback', END)
    .compile({
      checkpointer,
      name: 'fleetgraph.runtime',
    });
}

export function createFleetGraphRuntime(
  deps: FleetGraphRuntimeDeps = {}
): FleetGraphRuntime {
  const checkpointer = deps.checkpointer || new MemorySaver();
  const graph = buildCompiledGraph(checkpointer);

  return {
    checkpointer,
    async getState(threadId: string) {
      return graph.getState({
        configurable: { thread_id: threadId },
      });
    },
    async invoke(input: unknown) {
      const parsed = parseFleetGraphRuntimeInput(input);
      const initialState = {
        ...parsed,
        checkpointNamespace: 'fleetgraph' as const,
        routeSurface: buildRouteSurface(parsed),
      };
      const result = await graph.invoke(initialState, {
        configurable: {
          thread_id: parsed.threadId,
        },
      });

      return FleetGraphStateSchema.parse(result);
    },
  };
}

