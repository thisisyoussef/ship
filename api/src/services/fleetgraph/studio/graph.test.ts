import { MemorySaver } from '@langchain/langgraph'
import { describe, expect, it, vi } from 'vitest'

import { createFleetGraphRuntime, createFleetGraphStudioGraph } from '../graph/runtime.js'
import { createStudioPreviewSafeFleetGraph } from './graph.js'

function createDeps() {
  return {
    actionStore: {
      beginExecution: vi.fn(async (input) => ({
        execution: {
          actionType: input.actionType,
          attemptCount: 1,
          endpoint: input.endpoint,
          findingId: input.findingId,
          message: 'Pending execution.',
          status: 'pending' as const,
          updatedAt: new Date('2026-03-17T12:00:00.000Z'),
        },
        shouldExecute: true,
      })),
      finishExecution: vi.fn(),
      listExecutionsForFindings: vi.fn(async () => []),
    },
    checkpointer: new MemorySaver(),
    findingStore: {
      dismissFinding: vi.fn(),
      getFindingById: vi.fn(),
      getFindingByKey: vi.fn(),
      listActiveFindings: vi.fn(async () => []),
      resolveFinding: vi.fn(async () => null),
      snoozeFinding: vi.fn(),
      upsertFinding: vi.fn(),
    },
    llmAdapter: {
      generate: vi.fn(),
      model: 'gpt-5-mini',
      provider: 'openai' as const,
    },
    shipClient: {
      fetchChildren: vi.fn(async () => []),
      fetchDocument: vi.fn(async () => ({})),
      fetchMembers: vi.fn(async () => []),
      listSprintIssues: vi.fn(async () => ({ issues: [] })),
      listWeeks: vi.fn(async () => ({
        weeks: [],
        workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
      })),
    },
    tracingSettings: {
      enabled: false,
      flushTimeoutMs: 1000,
      projectName: 'ship-fleetgraph',
      sharePublicTraces: false,
    },
  }
}

describe('FleetGraph Studio graph export', () => {
  it('delegates to the same compiled graph contract as the runtime wrapper', async () => {
    const deps = createDeps()
    const runtime = createFleetGraphRuntime(deps)
    const graph = createFleetGraphStudioGraph(deps)

    await graph.invoke({
      contextKind: 'proactive',
      mode: 'proactive',
      routeSurface: 'workspace-sweep',
      scenarioResults: [],
      threadId: 'thread-studio',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-123',
    }, {
      configurable: {
        thread_id: 'thread-studio',
      },
    })

    const runtimeState = await runtime.invoke({
      contextKind: 'proactive',
      mode: 'proactive',
      threadId: 'thread-runtime',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-123',
    })

    const studioState = await graph.getState({
      configurable: {
        thread_id: 'thread-studio',
      },
    })

    expect(studioState.values).toEqual(expect.objectContaining({
      branch: runtimeState.branch,
      checkpointNamespace: runtimeState.checkpointNamespace,
      outcome: runtimeState.outcome,
    }))
  })

  it('builds a preview-safe graph even when Ship REST env is missing', async () => {
    const graph = createStudioPreviewSafeFleetGraph({
      OPENAI_API_KEY: 'test-openai-key',
    })

    const state = await graph.getState({
      configurable: {
        thread_id: 'preview-safe-thread',
      },
    })

    expect(state.values).toEqual({})
  })
})
