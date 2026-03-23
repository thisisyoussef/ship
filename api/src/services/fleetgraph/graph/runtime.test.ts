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

function createShipClientMock() {
  return {
    fetchChildren: vi.fn(async () => []),
    fetchDocument: vi.fn(async () => ({})),
    fetchMembers: vi.fn(async () => []),
    listSprintIssues: vi.fn<(sprintId: string) => Promise<{
      issues: Array<{
        assignee_id: string | null
        id: string
        status: string
        title: string
      }>
    }>>(async () => ({ issues: [] })),
    listWeeks: vi.fn(async () => ({
      weeks: [],
      workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
    })),
  }
}

function createActionStoreMock(): FleetGraphFindingActionStore {
  return {
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
    finishExecution: vi.fn(async (input) => ({
      actionType: input.actionType,
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
      shipClient: createShipClientMock(),
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
      shipClient: createShipClientMock(),
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

  it('surfaces sprint-owner gaps as a real proactive finding when a started week has no owner', async () => {
    const upsertFinding = vi.fn(async (input) => ({
      dedupeKey: input.dedupeKey,
      documentId: input.documentId,
      documentType: input.documentType,
      evidence: input.evidence,
      findingKey: input.findingKey,
      findingType: input.findingType,
      id: 'finding-owner-gap',
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
    }))
    const findingStore = {
      ...createFindingStoreMock(),
      listActiveFindings: vi.fn(async () => []),
      upsertFinding,
    }
    const shipClient = createShipClientMock()
    shipClient.listWeeks.mockResolvedValue({
      weeks: [
        {
          id: 'week-8',
          issue_count: 3,
          name: 'Sprint 8',
          owner: null,
          sprint_number: 2,
          status: 'active',
          workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
        },
      ],
      workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
    } as Awaited<ReturnType<typeof shipClient.listWeeks>>)
    const generate = vi.fn(async () => ({
      model: 'gpt-5-mini',
      provider: 'openai' as const,
      text: 'Sprint 8 needs a named owner before coordination slips.',
    }))

    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore,
      llmAdapter: {
        generate,
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient,
      tracingSettings: {
        enabled: false,
        flushTimeoutMs: 1000,
        projectName: 'ship-fleetgraph',
        sharePublicTraces: false,
      },
    })

    const response = await runtime.invoke({
      contextKind: 'proactive',
      mode: 'proactive',
      threadId: 'thread-owner-gap',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-123',
    })

    expect(response).toMatchObject({
      branch: 'reasoned',
      outcome: 'advisory',
      selectedScenario: 'sprint_no_owner',
    })
    expect(response.path).toEqual(expect.arrayContaining([
      'resolve_trigger_context',
      'select_scenarios',
      'run_scenario:sprint_no_owner',
      'merge_candidates',
      'score_and_rank',
      'reason_and_deliver',
      'persist_result',
    ]))
    expect(upsertFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'week-8',
        findingKey: 'sprint-no-owner:workspace-123:week-8',
        findingType: 'sprint_no_owner',
        summary: 'Sprint 8 needs a named owner before coordination slips.',
        title: 'Sprint owner gap: Sprint 8',
      }),
      expect.any(Date)
    )
  })

  it('surfaces unassigned sprint issues as a real proactive finding when a started week has enough unassigned work', async () => {
    const upsertFinding = vi.fn(async (input) => ({
      dedupeKey: input.dedupeKey,
      documentId: input.documentId,
      documentType: input.documentType,
      evidence: input.evidence,
      findingKey: input.findingKey,
      findingType: input.findingType,
      id: 'finding-unassigned',
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
    }))
    const findingStore = {
      ...createFindingStoreMock(),
      listActiveFindings: vi.fn(async () => []),
      upsertFinding,
    }
    const shipClient = createShipClientMock()
    shipClient.listWeeks.mockResolvedValue({
      weeks: [
        {
          id: 'week-9',
          issue_count: 5,
          name: 'Sprint 9',
          owner: {
            id: 'owner-1',
            name: 'Dev User',
          },
          sprint_number: 2,
          status: 'active',
          workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
        },
      ],
      workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
    } as Awaited<ReturnType<typeof shipClient.listWeeks>>)
    shipClient.listSprintIssues.mockResolvedValue({
      issues: [
        { assignee_id: null, id: 'issue-1', status: 'open', title: 'Issue 1' },
        { assignee_id: null, id: 'issue-2', status: 'open', title: 'Issue 2' },
        { assignee_id: null, id: 'issue-3', status: 'open', title: 'Issue 3' },
        { assignee_id: 'user-4', id: 'issue-4', status: 'open', title: 'Issue 4' },
        { assignee_id: 'user-5', id: 'issue-5', status: 'open', title: 'Issue 5' },
      ],
    } as Awaited<ReturnType<typeof shipClient.listSprintIssues>>)
    const generate = vi.fn(async () => ({
      model: 'gpt-5-mini',
      provider: 'openai' as const,
      text: 'Sprint 9 has several unassigned issues, so ownership is still unclear for this week.',
    }))

    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore,
      llmAdapter: {
        generate,
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient,
      tracingSettings: {
        enabled: false,
        flushTimeoutMs: 1000,
        projectName: 'ship-fleetgraph',
        sharePublicTraces: false,
      },
    })

    const response = await runtime.invoke({
      contextKind: 'proactive',
      mode: 'proactive',
      threadId: 'thread-unassigned-issues',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-123',
    })

    expect(response).toMatchObject({
      branch: 'reasoned',
      outcome: 'advisory',
      selectedScenario: 'unassigned_sprint_issues',
    })
    expect(response.path).toEqual(expect.arrayContaining([
      'resolve_trigger_context',
      'select_scenarios',
      'run_scenario:unassigned_sprint_issues',
      'merge_candidates',
      'score_and_rank',
      'reason_and_deliver',
      'persist_result',
    ]))
    expect(upsertFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'week-9',
        findingKey: 'unassigned-issues:workspace-123:week-9',
        findingType: 'unassigned_sprint_issues',
        summary: 'Sprint 9 has several unassigned issues, so ownership is still unclear for this week.',
      }),
      expect.any(Date)
    )
  })

  it('keeps checking later started weeks when the first active week does not have enough unassigned issues', async () => {
    const upsertFinding = vi.fn(async (input) => ({
      dedupeKey: input.dedupeKey,
      documentId: input.documentId,
      documentType: input.documentType,
      evidence: input.evidence,
      findingKey: input.findingKey,
      findingType: input.findingType,
      id: 'finding-unassigned-later-week',
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
    }))
    const findingStore = {
      ...createFindingStoreMock(),
      listActiveFindings: vi.fn(async () => []),
      upsertFinding,
    }
    const shipClient = createShipClientMock()
    shipClient.listWeeks.mockResolvedValue({
      weeks: [
        {
          id: 'week-older',
          issue_count: 2,
          name: 'Sprint 1',
          owner: {
            id: 'owner-1',
            name: 'Dev User',
          },
          sprint_number: 1,
          status: 'active',
          workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
        },
        {
          id: 'week-target',
          issue_count: 4,
          name: 'Sprint 2',
          owner: {
            id: 'owner-2',
            name: 'PM User',
          },
          sprint_number: 2,
          status: 'active',
          workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
        },
      ],
      workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
    } as Awaited<ReturnType<typeof shipClient.listWeeks>>)
    shipClient.listSprintIssues.mockImplementation(async (sprintId: string) => {
      if (sprintId === 'week-older') {
        return {
          issues: [
            { assignee_id: null, id: 'issue-1', status: 'open', title: 'Issue 1' },
            { assignee_id: 'user-2', id: 'issue-2', status: 'open', title: 'Issue 2' },
          ],
        }
      }

      return {
        issues: [
          { assignee_id: null, id: 'issue-3', status: 'open', title: 'Issue 3' },
          { assignee_id: null, id: 'issue-4', status: 'open', title: 'Issue 4' },
          { assignee_id: null, id: 'issue-5', status: 'open', title: 'Issue 5' },
          { assignee_id: 'user-6', id: 'issue-6', status: 'open', title: 'Issue 6' },
        ],
      }
    })
    const generate = vi.fn(async () => ({
      model: 'gpt-5-mini',
      provider: 'openai' as const,
      text: 'Sprint 2 has multiple unassigned issues, so the team still lacks clear ownership on several tasks.',
    }))

    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore,
      llmAdapter: {
        generate,
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient,
      tracingSettings: {
        enabled: false,
        flushTimeoutMs: 1000,
        projectName: 'ship-fleetgraph',
        sharePublicTraces: false,
      },
    })

    const response = await runtime.invoke({
      contextKind: 'proactive',
      mode: 'proactive',
      threadId: 'thread-unassigned-issues-later-week',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-123',
    })

    expect(response).toMatchObject({
      branch: 'reasoned',
      outcome: 'advisory',
      selectedScenario: 'unassigned_sprint_issues',
    })
    expect(shipClient.listSprintIssues).toHaveBeenNthCalledWith(1, 'week-older')
    expect(shipClient.listSprintIssues).toHaveBeenNthCalledWith(2, 'week-target')
    expect(upsertFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'week-target',
        findingKey: 'unassigned-issues:workspace-123:week-target',
        findingType: 'unassigned_sprint_issues',
      }),
      expect.any(Date)
    )
  })

  it('preserves the seeded unassigned-issues demo finding during quiet sweeps', async () => {
    const resolveFinding = vi.fn(async () => null)
    const findingStore = {
      ...createFindingStoreMock(),
      listActiveFindings: vi.fn(async () => [
        {
          dedupeKey: 'dedupe-demo',
          documentId: 'week-demo',
          documentType: 'sprint' as const,
          evidence: [],
          findingKey: 'unassigned-issues:workspace-123:week-demo',
          findingType: 'unassigned_sprint_issues' as const,
          id: 'finding-demo',
          metadata: {
            preserveDemoLane: true,
          },
          recommendedAction: undefined,
          status: 'active' as const,
          summary: 'Demo finding',
          threadId: 'thread-demo',
          title: '3 unassigned issues in Demo Sprint',
          updatedAt: new Date('2026-03-17T12:00:00.000Z'),
          workspaceId: 'workspace-123',
        },
      ]),
      resolveFinding,
    }
    const shipClient = createShipClientMock()
    shipClient.listWeeks.mockResolvedValue({
      weeks: [],
      workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
    } as Awaited<ReturnType<typeof shipClient.listWeeks>>)

    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore,
      llmAdapter: {
        generate: vi.fn(),
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient,
      tracingSettings: {
        enabled: false,
        flushTimeoutMs: 1000,
        projectName: 'ship-fleetgraph',
        sharePublicTraces: false,
      },
    })

    const response = await runtime.invoke({
      contextKind: 'proactive',
      mode: 'proactive',
      threadId: 'thread-unassigned-demo-quiet',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-123',
    })

    expect(response).toMatchObject({
      branch: 'quiet',
    })
    expect(resolveFinding).not.toHaveBeenCalled()
  })

  it('routes on-demand runs through fetch_medium → reason when page context is available', async () => {
    const llmResponse = JSON.stringify({
      analysisText: 'Everything looks healthy.',
      deeperContextHint: null,
      findings: [],
      needsDeeperContext: false,
    })
    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore: createFindingStoreMock(),
      llmAdapter: {
        generate: vi.fn(async () => ({ model: 'gpt-5-mini', provider: 'openai' as const, text: llmResponse })),
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient: createShipClientMock(),
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
      'run_scenario:on_demand_analysis',
      'merge_candidates',
      'score_and_rank',
      'persist_result',
    ]))
  })

  it('uses request-bound Ship reads for on-demand analysis when the route provides them', async () => {
    const shipClient = createShipClientMock()
    const generate = vi.fn(async ({ input }: { input: string }) => ({
      model: 'gpt-5-mini',
      provider: 'openai' as const,
      text: JSON.stringify({
        analysisText: input.includes('## User Question')
          ? 'There is also an unassigned issue to review.'
          : 'Everything looks healthy.',
        deeperContextHint: null,
        findings: [],
        needsDeeperContext: false,
      }),
    }))
    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore: createFindingStoreMock(),
      llmAdapter: {
        generate,
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient,
      tracingSettings: {
        enabled: false,
        flushTimeoutMs: 1000,
        projectName: 'ship-fleetgraph',
        sharePublicTraces: false,
      },
    })

    await runtime.invoke({
      contextKind: 'entry',
      documentId: 'doc-123',
      documentTitle: 'Launch planner',
      documentType: 'project',
      mode: 'on_demand',
      threadId: 'thread-doc',
      trigger: 'document-context',
      workspaceId: 'workspace-123',
    }, {
      fleetgraphReadRequestContext: {
        baseUrl: 'https://ship-demo-production.up.railway.app',
        cookieHeader: 'ship_session=demo',
        csrfToken: 'csrf-token',
      },
    })

    expect(shipClient.fetchDocument).toHaveBeenCalledWith(
      'doc-123',
      'project',
      expect.objectContaining({
        baseUrl: 'https://ship-demo-production.up.railway.app',
        cookieHeader: 'ship_session=demo',
        csrfToken: 'csrf-token',
      })
    )
    expect(shipClient.fetchChildren).toHaveBeenCalledWith(
      'doc-123',
      'project',
      expect.objectContaining({
        baseUrl: 'https://ship-demo-production.up.railway.app',
        cookieHeader: 'ship_session=demo',
        csrfToken: 'csrf-token',
      })
    )
  })

  it('keeps follow-up turns on the same thread and includes the user message in reasoning state', async () => {
    const generate = vi.fn(async ({ input }: { input: string }) => ({
      model: 'gpt-5-mini',
      provider: 'openai' as const,
      text: JSON.stringify({
        analysisText: input.includes('## User Question')
          ? 'There is one more issue worth reviewing.'
          : 'Everything looks healthy.',
        deeperContextHint: null,
        findings: [],
        needsDeeperContext: false,
      }),
    }))

    const runtime = createFleetGraphRuntime({
      actionStore: createActionStoreMock(),
      checkpointer: new MemorySaver(),
      findingStore: createFindingStoreMock(),
      llmAdapter: {
        generate,
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient: createShipClientMock(),
      tracingSettings: {
        enabled: false,
        flushTimeoutMs: 1000,
        projectName: 'ship-fleetgraph',
        sharePublicTraces: false,
      },
    })

    await runtime.invoke({
      contextKind: 'entry',
      documentId: 'doc-123',
      documentTitle: 'Launch planner',
      documentType: 'project',
      mode: 'on_demand',
      threadId: 'thread-doc',
      trigger: 'document-context',
      workspaceId: 'workspace-123',
    })

    const followUp = await runtime.invoke({
      contextKind: 'entry',
      documentId: 'doc-123',
      documentTitle: 'Launch planner',
      documentType: 'project',
      mode: 'on_demand',
      threadId: 'thread-doc',
      trigger: 'document-context',
      userMessage: 'What else should I look at?',
      workspaceId: 'workspace-123',
    })

    expect(followUp.analysisText).toBe('There is one more issue worth reviewing.')
    expect(followUp.turnCount).toBe(2)
    expect(followUp.conversationHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        content: 'What else should I look at?',
        role: 'user',
      }),
      expect.objectContaining({
        content: 'There is one more issue worth reviewing.',
        role: 'assistant',
      }),
    ]))
    expect(generate).toHaveBeenLastCalledWith(expect.objectContaining({
      input: expect.stringContaining('## User Question\nWhat else should I look at?'),
    }))
  })

  it('executes tracked assign-owner reviews through the runtime-mediated PATCH path', async () => {
    const actionStore = createActionStoreMock()
    const executeShipRestAction = vi.fn(async () => ({
      body: {
        owner_id: 'user-123',
      },
      ok: true,
      status: 200,
    }))
    const runtime = createFleetGraphRuntime({
      actionStore,
      checkpointer: new MemorySaver(),
      executeShipRestAction,
      findingStore: createFindingStoreMock(),
      llmAdapter: {
        generate: vi.fn(),
        model: 'gpt-5-mini',
        provider: 'openai',
      },
      shipClient: createShipClientMock(),
      tracingSettings: {
        enabled: false,
        flushTimeoutMs: 1000,
        projectName: 'ship-fleetgraph',
        sharePublicTraces: false,
      },
    })

    await runtime.invoke({
      contextKind: 'finding_review',
      documentId: 'week-8',
      documentType: 'sprint',
      findingId: 'finding-owner-gap',
      mode: 'on_demand',
      requestedAction: {
        body: {
          owner_id: 'user-123',
        },
        endpoint: {
          method: 'PATCH',
          path: '/api/documents/week-8',
        },
        evidence: ['No sprint owner is assigned right now.'],
        rationale: 'Assigning accountability should stay a human-reviewed action.',
        summary: 'Assign yourself as sprint owner so someone is accountable for coordination.',
        targetId: 'week-8',
        targetType: 'sprint',
        title: 'Assign sprint owner',
        type: 'assign_owner',
      },
      routeSurface: 'document-page',
      threadId: 'thread-assign-owner',
      trigger: 'human-review',
      workspaceId: 'workspace-123',
    })

    const resumed = await runtime.resume(
      'thread-assign-owner',
      'approved',
      {
        fleetgraphActionRequestContext: {
          baseUrl: 'http://localhost:3000',
        },
      }
    )

    expect(executeShipRestAction).toHaveBeenCalledWith(
      '/api/documents/week-8',
      {
        baseUrl: 'http://localhost:3000',
      },
      'PATCH',
      {
        owner_id: 'user-123',
      }
    )
    expect(actionStore.beginExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'assign_owner',
        endpoint: {
          method: 'PATCH',
          path: '/api/documents/week-8',
        },
      }),
      expect.any(Date)
    )
    expect(actionStore.finishExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'assign_owner',
        message: 'Sprint owner assigned in Ship. Look for Owner showing the person you selected on this page.',
        resultStatusCode: 200,
        status: 'applied',
      }),
      expect.any(Date)
    )
    expect(resumed.actionOutcome).toMatchObject({
      message: 'Sprint owner assigned in Ship. Look for Owner showing the person you selected on this page.',
      status: 'applied',
    })
  })
})
