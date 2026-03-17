import { describe, expect, it, vi } from 'vitest'
import { MemorySaver } from '@langchain/langgraph'

import type { FleetGraphFindingActionStore } from '../actions/index.js'
import type { FleetGraphFindingStore } from '../findings/index.js'
import { createFleetGraphRuntime } from './runtime.js'

function createFindingStoreMock(): FleetGraphFindingStore {
  return {
    dismissFinding: vi.fn(),
    getFindingById: vi.fn(),
    getFindingByKey: vi.fn(),
    listActiveFindings: vi.fn(async () => []),
    resolveFinding: vi.fn(async () => null),
    snoozeFinding: vi.fn(),
    upsertFinding: vi.fn(async (input) => ({
      dedupeKey: input.dedupeKey,
      documentId: input.documentId,
      documentType: input.documentType,
      evidence: input.evidence,
      findingKey: input.findingKey,
      findingType: 'week_start_drift' as const,
      id: 'finding-1',
      metadata: input.metadata ?? {},
      recommendedAction: input.recommendedAction,
      status: 'active' as const,
      summary: input.summary,
      threadId: input.threadId,
      title: input.title,
      tracePublicUrl: input.tracePublicUrl,
      traceRunId: input.traceRunId,
      updatedAt: new Date('2026-03-17T12:00:00.000Z'),
      workspaceId: input.workspaceId,
    })),
  }
}

function createActionStoreMock(): FleetGraphFindingActionStore {
  return {
    beginStartWeekExecution: vi.fn(async (input) => ({
      execution: {
        actionType: 'start_week' as const,
        attemptCount: 1,
        endpoint: input.endpoint,
        findingId: input.findingId,
        message: 'Pending execution.',
        status: 'pending' as const,
        updatedAt: new Date('2026-03-17T12:00:00.000Z'),
      },
      shouldExecute: true,
    })),
    finishStartWeekExecution: vi.fn(async (input) => ({
      actionType: 'start_week' as const,
      appliedAt: input.appliedAt,
      attemptCount: 1,
      endpoint: input.endpoint,
      findingId: input.findingId,
      message: input.message,
      resultStatusCode: input.resultStatusCode,
      status: input.status,
      updatedAt: new Date('2026-03-17T12:05:00.000Z'),
    })),
    listExecutionsForFindings: vi.fn(async () => []),
  }
}

describe('createFleetGraphRuntime', () => {
  it('rejects missing required fields from the shared state schema', async () => {
    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore: createFindingStoreMock(),
      llmAdapter: {
        generate: vi.fn(),
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient: {
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
    })

    await expect(
      runtime.invoke({
        mode: 'proactive',
        threadId: 'thread-missing-context',
        trigger: 'scheduled-sweep',
        workspaceId: 'workspace-123',
      })
    ).rejects.toThrow(/contextKind/i)
  })

  it('routes proactive runs through scenario selection and quiet exit when no candidate exists', async () => {
    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore: createFindingStoreMock(),
      llmAdapter: {
        generate: vi.fn(),
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient: {
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
    })

    const quiet = await runtime.invoke({
      contextKind: 'proactive',
      mode: 'proactive',
      threadId: 'thread-quiet',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-123',
    })

    expect(quiet).toMatchObject({
      branch: 'quiet',
      checkpointNamespace: 'fleetgraph',
      contextKind: 'proactive',
      outcome: 'quiet',
      routeSurface: 'workspace-sweep',
    })
    expect(quiet.path).toEqual(expect.arrayContaining([
      'resolve_trigger_context',
      'select_scenarios',
      'run_scenario:week_start_drift',
      'merge_candidates',
      'score_and_rank',
      'quiet_exit',
      'persist_result',
    ]))

    const quietCheckpoint = await runtime.getState('thread-quiet')
    expect(quietCheckpoint.values).toEqual(expect.objectContaining({
      branch: 'quiet',
      threadId: 'thread-quiet',
    }))
  })

  it('routes on-demand runs through the reasoned path when page context is available', async () => {
    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore: createFindingStoreMock(),
      llmAdapter: {
        generate: vi.fn(),
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient: {
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
    })

    const response = await runtime.invoke({
      contextKind: 'entry',
      documentId: 'doc-123',
      documentTitle: 'Launch planner',
      documentType: 'project',
      mode: 'on_demand',
      threadId: 'thread-doc',
      trigger: 'document-context',
      workspaceId: 'workspace-123',
    })

    expect(response).toMatchObject({
      branch: 'reasoned',
      contextKind: 'entry',
      outcome: 'advisory',
      routeSurface: 'document-page',
    })
    expect(response.path).toEqual(expect.arrayContaining([
      'resolve_trigger_context',
      'select_scenarios',
      'run_scenario:entry_context_check',
      'merge_candidates',
      'score_and_rank',
      'reason_and_deliver',
      'persist_result',
    ]))
  })
})
