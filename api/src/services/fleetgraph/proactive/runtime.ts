import type { FleetGraphState } from '../graph/types.js'
import type { FleetGraphFindingActionStore } from '../actions/index.js'
import type { FleetGraphFindingStore } from '../findings/index.js'
import type { BaseCheckpointSaver } from '@langchain/langgraph'
import type { LLMAdapter } from '../llm/index.js'
import type { FleetGraphShipApiClient } from './types.js'
import type {
  FleetGraphTracingSettings,
  LangSmithClientLike,
} from '../tracing/index.js'

interface FleetGraphRuntimeLike {
  getState(threadId: string): Promise<unknown>
  invoke(input: unknown, configurable?: Record<string, unknown>): Promise<FleetGraphState>
}

interface FleetGraphProactiveRuntimeDeps {
  baseRuntime?: FleetGraphRuntimeLike
  actionStore?: FleetGraphFindingActionStore
  checkpointer?: BaseCheckpointSaver
  executeShipRestAction?: (
    path: string,
    requestContext: { baseUrl: string; cookieHeader?: string; csrfToken?: string }
  ) => Promise<{ body?: Record<string, unknown>; ok: boolean; status: number }>
  findingStore?: FleetGraphFindingStore
  findings?: FleetGraphFindingStore
  llmAdapter?: LLMAdapter
  now?: () => Date
  shipClient?: FleetGraphShipApiClient
  tracingClient?: LangSmithClientLike
  tracingSettings?: FleetGraphTracingSettings
}

export function createFleetGraphProactiveRuntime(
  deps: FleetGraphProactiveRuntimeDeps = {}
): FleetGraphRuntimeLike {
  if (!deps.baseRuntime) {
    throw new Error(
      'createFleetGraphProactiveRuntime now requires an injected base runtime. Use createFleetGraphV2Runtime for canonical production wiring.'
    )
  }

  const baseRuntime = deps.baseRuntime

  return {
    getState(threadId: string) {
      return baseRuntime.getState(threadId)
    },

    async invoke(input: unknown) {
      const stateInput = input as {
        documentId?: string
        mode: 'on_demand' | 'proactive'
        routeSurface?: string
        threadId: string
        trigger: 'document-context' | 'event' | 'scheduled-sweep' | 'human-review'
        workspaceId: string
      }

      if (stateInput.mode !== 'proactive') {
        return baseRuntime.invoke(input)
      }

      return baseRuntime.invoke({
        ...stateInput,
        contextKind: 'proactive',
      })
    },
  }
}
