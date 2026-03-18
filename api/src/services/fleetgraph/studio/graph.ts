import { MemorySaver } from '@langchain/langgraph'

import { createFleetGraphStudioGraph } from '../graph/runtime.js'
import {
  createLLMAdapter,
  resolveLLMConfig,
  type LLMAdapter,
} from '../llm/index.js'
import {
  createFleetGraphShipApiClient,
  resolveFleetGraphShipApiConfig,
} from '../proactive/ship-client.js'
import type { FleetGraphShipApiClient } from '../proactive/types.js'

function buildStudioCheckpointer(env: NodeJS.ProcessEnv = process.env) {
  if (env.FLEETGRAPH_STUDIO_CHECKPOINTER === 'postgres') {
    return undefined
  }

  return new MemorySaver()
}

function buildStudioSafeShipClient(
  env: NodeJS.ProcessEnv = process.env
): FleetGraphShipApiClient {
  try {
    return createFleetGraphShipApiClient(resolveFleetGraphShipApiConfig(env))
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'FleetGraph Ship REST access is not configured.'

    return {
      async fetchChildren() {
        throw new Error(message)
      },
      async fetchDocument() {
        throw new Error(message)
      },
      async fetchMembers() {
        throw new Error(message)
      },
      async listSprintIssues() {
        throw new Error(message)
      },
      async listWeeks() {
        throw new Error(message)
      },
    }
  }
}

function buildStudioSafeLLMAdapter(
  env: NodeJS.ProcessEnv = process.env
): LLMAdapter {
  try {
    return createLLMAdapter(resolveLLMConfig(env))
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'FleetGraph LLM access is not configured.'

    return {
      async generate() {
        throw new Error(message)
      },
      model: 'studio-unconfigured',
      provider: 'openai',
    }
  }
}

export function createStudioPreviewSafeFleetGraph(
  env: NodeJS.ProcessEnv = process.env
) {
  return createFleetGraphStudioGraph({
    checkpointer: buildStudioCheckpointer(env),
    llmAdapter: buildStudioSafeLLMAdapter(env),
    shipClient: buildStudioSafeShipClient(env),
  }, env)
}

export const fleetgraphStudioGraph = createStudioPreviewSafeFleetGraph()

export function makeFleetGraphStudioGraph() {
  return createStudioPreviewSafeFleetGraph()
}
