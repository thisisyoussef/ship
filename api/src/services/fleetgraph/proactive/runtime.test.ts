import { describe, expect, it, vi } from 'vitest'

import type { FleetGraphFindingStore } from '../findings/index.js'
import type { FleetGraphFindingRecord } from '../findings/index.js'
import type { FleetGraphState } from '../graph/types.js'
import type { FleetGraphShipApiClient } from './types.js'
import { createFleetGraphProactiveRuntime } from './runtime.js'

function makeState(
  overrides: Partial<FleetGraphState> = {}
): FleetGraphState {
  return {
    approvalRequired: false,
    branch: 'reasoned',
    candidateCount: 1,
    checkpointNamespace: 'fleetgraph',
    documentId: 'week-1',
    hasError: false,
    mode: 'proactive',
    outcome: 'advisory',
    path: ['resolve_trigger_context', 'determine_branch', 'reason_and_deliver'],
    routeSurface: 'workspace-sweep',
    threadId: 'fleetgraph:workspace-1:scheduled-sweep',
    trigger: 'scheduled-sweep',
    workspaceId: 'workspace-1',
    ...overrides,
  }
}

function createFindingStoreMock(): FleetGraphFindingStore {
  return {
    dismissFinding: vi.fn(),
    getFindingById: vi.fn(),
    getFindingByKey: vi.fn(),
    listActiveFindings: vi.fn(async () => []),
    resolveFinding: vi.fn(async () => null),
    snoozeFinding: vi.fn(),
    upsertFinding: vi.fn(async (input) => ({
      cooldownUntil: input.cooldownUntil,
      dedupeKey: input.dedupeKey,
      documentId: input.documentId,
      documentType: input.documentType,
      evidence: input.evidence,
      findingKey: input.findingKey,
      findingType: input.findingType,
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
    } satisfies FleetGraphFindingRecord)),
  }
}

function makeWeeksResponse(): Awaited<ReturnType<FleetGraphShipApiClient['listWeeks']>> {
  return {
    weeks: [
      {
        id: 'week-1',
        issue_count: 0,
        name: 'Current Week',
        owner: { id: 'person-1', name: 'Morgan PM' },
        program_name: 'North Star',
        sprint_number: 1,
        status: 'planning',
        workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
      },
    ],
    workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
  }
}

describe('FleetGraph proactive runtime', () => {
  it('turns a proactive candidate into a persisted week-start finding', async () => {
    const baseRuntime = {
      getState: vi.fn(),
      invoke: vi.fn(async () => makeState()),
    }
    const findings = createFindingStoreMock()
    const llmAdapter = {
      generate: vi.fn(async () => ({
        model: 'gpt-5-mini',
        provider: 'openai' as const,
        text: 'Current Week should be started because it is still in planning after its start window.',
      })),
      model: 'gpt-5-mini',
      provider: 'openai' as const,
    }
    const runtime = createFleetGraphProactiveRuntime({
      baseRuntime,
      findings,
      llmAdapter,
      shipClient: {
        listWeeks: vi.fn(async () => makeWeeksResponse()),
      },
      tracingSettings: {
        enabled: false,
        flushTimeoutMs: 1000,
        projectName: 'ship-fleetgraph',
        sharePublicTraces: false,
      },
    })

    const result = await runtime.invoke({
      mode: 'proactive',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-1',
    })

    expect(result.branch).toBe('reasoned')
    expect(baseRuntime.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateCount: 1,
        documentId: 'week-1',
      })
    )
    expect(findings.upsertFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'week-1',
        findingKey: 'week-start-drift:workspace-1:week-1',
        workspaceId: 'workspace-1',
      }),
      expect.any(Date)
    )
  })

  it('resolves stale active findings when the workspace is quiet', async () => {
    const baseRuntime = {
      getState: vi.fn(),
      invoke: vi.fn(async () => makeState({
        branch: 'quiet',
        candidateCount: 0,
        documentId: undefined,
        outcome: 'quiet',
        path: ['resolve_trigger_context', 'determine_branch', 'quiet_exit'],
      })),
    }
    const findings = createFindingStoreMock()
    vi.mocked(findings.listActiveFindings).mockResolvedValue([
      {
        cooldownUntil: undefined,
        dedupeKey: 'dedupe-1',
        documentId: 'week-1',
        documentType: 'sprint',
        evidence: [],
        findingKey: 'week-start-drift:workspace-1:week-1',
        findingType: 'week_start_drift',
        id: 'finding-1',
        metadata: {},
        status: 'active',
        summary: 'summary',
        threadId: 'thread-1',
        title: 'title',
        updatedAt: new Date('2026-03-17T12:00:00.000Z'),
        workspaceId: 'workspace-1',
      },
    ])

    const runtime = createFleetGraphProactiveRuntime({
      baseRuntime,
      findings,
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

    const result = await runtime.invoke({
      mode: 'proactive',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep',
      trigger: 'scheduled-sweep',
      workspaceId: 'workspace-1',
    })

    expect(result.branch).toBe('quiet')
    expect(findings.resolveFinding).toHaveBeenCalledWith(
      'week-start-drift:workspace-1:week-1',
      expect.any(Date)
    )
    expect(findings.upsertFinding).not.toHaveBeenCalled()
  })
})
