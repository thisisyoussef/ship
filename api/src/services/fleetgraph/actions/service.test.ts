import { describe, expect, it, vi } from 'vitest'

import type { FleetGraphFindingRecord } from '../findings/types.js'
import { createFleetGraphFindingActionService } from './service.js'

function makeFinding(
  overrides: Partial<FleetGraphFindingRecord> = {}
): FleetGraphFindingRecord {
  return {
    dedupeKey: 'dedupe-1',
    documentId: '11111111-1111-4111-8111-111111111111',
    documentType: 'sprint',
    evidence: ['Week is still in planning after its start date.'],
    findingKey: 'week-start-drift:workspace-1:sprint-1',
    findingType: 'week_start_drift',
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    metadata: {},
    recommendedAction: {
      endpoint: {
        method: 'POST',
        path: '/api/weeks/11111111-1111-4111-8111-111111111111/start',
      },
      evidence: ['Week is still planning after its start date.'],
      rationale: 'Start the week after human review.',
      summary: 'Start the week.',
      targetId: '11111111-1111-4111-8111-111111111111',
      targetType: 'sprint',
      title: 'Start week',
      type: 'start_week',
    },
    status: 'active',
    summary: 'Week still needs to be started.',
    threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-1',
    title: 'Week start drift',
    updatedAt: new Date('2026-03-17T12:00:00.000Z'),
    workspaceId: 'workspace-1',
    ...overrides,
  }
}

describe('FleetGraph finding action service', () => {
  it('creates a pending review without mutating Ship', async () => {
    const finding = makeFinding()
    const runtime = {
      getCheckpointHistory: vi.fn(),
      getPendingInterrupts: vi.fn(async () => []),
      getState: vi.fn(),
      invoke: vi.fn(async () => ({
        branch: 'approval_required',
        candidateCount: 1,
        checkpointNamespace: 'fleetgraph',
        contextKind: 'finding_review',
        mode: 'on_demand',
        outcome: 'approval_required',
        path: ['resolve_trigger_context', 'select_scenarios', 'approval_interrupt'],
        routeSurface: 'document-page',
        scenarioResults: [],
        threadId: 'fleetgraph:workspace-1:finding-review',
        trigger: 'human-review',
        workspaceId: 'workspace-1',
        approvalRequired: true,
      })),
      invokeRaw: vi.fn(),
      resume: vi.fn(),
      checkpointer: {} as never,
      checkpointerKind: 'memory',
    }
    const service = createFleetGraphFindingActionService({
      actionStore: {
        beginStartWeekExecution: vi.fn(),
        finishStartWeekExecution: vi.fn(),
        listExecutionsForFindings: vi.fn(async () => []),
      },
      findingStore: {
        dismissFinding: vi.fn(),
        getFindingById: vi.fn(async () => finding),
        getFindingByKey: vi.fn(),
        listActiveFindings: vi.fn(async () => []),
        resolveFinding: vi.fn(),
        snoozeFinding: vi.fn(),
        upsertFinding: vi.fn(),
      },
      runtime: runtime as never,
    })

    const result = await service.reviewStartWeekFinding({
      findingId: finding.id,
      workspaceId: 'workspace-1',
    })

    expect(runtime.invoke).toHaveBeenCalled()
    expect(runtime.resume).not.toHaveBeenCalled()
    expect(result.review.confirmLabel).toBe('Start week in Ship')
  })

  it('resumes an approved review with the current request context', async () => {
    const finding = makeFinding()
    const runtime = {
      getCheckpointHistory: vi.fn(),
      getPendingInterrupts: vi.fn(async () => [{ taskName: 'approval_interrupt' }]),
      getState: vi.fn(),
      invoke: vi.fn(),
      invokeRaw: vi.fn(),
      resume: vi.fn(async () => ({
        actionOutcome: {
          message: 'Week started successfully with 3 scoped issues.',
          resultStatusCode: 200,
          status: 'applied',
        },
        branch: 'approval_required',
        candidateCount: 1,
        checkpointNamespace: 'fleetgraph',
        contextKind: 'finding_review',
        mode: 'on_demand',
        outcome: 'approval_required',
        path: ['resolve_trigger_context', 'approval_interrupt', 'execute_action'],
        routeSurface: 'document-page',
        scenarioResults: [],
        threadId: 'fleetgraph:workspace-1:finding-review',
        trigger: 'human-review',
        workspaceId: 'workspace-1',
        approvalRequired: true,
      })),
      checkpointer: {} as never,
      checkpointerKind: 'memory',
    }

    const service = createFleetGraphFindingActionService({
      actionStore: {
        beginStartWeekExecution: vi.fn(),
        finishStartWeekExecution: vi.fn(),
        listExecutionsForFindings: vi.fn(async () => [{
          actionType: 'start_week' as const,
          appliedAt: new Date('2026-03-17T12:05:00.000Z'),
          attemptCount: 1,
          endpoint: {
            method: 'POST' as const,
            path: '/api/weeks/11111111-1111-4111-8111-111111111111/start',
          },
          findingId: finding.id,
          message: 'Week started successfully with 3 scoped issues.',
          resultStatusCode: 200,
          status: 'applied' as const,
          updatedAt: new Date('2026-03-17T12:05:00.000Z'),
        }]),
      },
      findingStore: {
        dismissFinding: vi.fn(),
        getFindingById: vi.fn(async () => finding),
        getFindingByKey: vi.fn(),
        listActiveFindings: vi.fn(async () => []),
        resolveFinding: vi.fn(),
        snoozeFinding: vi.fn(),
        upsertFinding: vi.fn(),
      },
      runtime: runtime as never,
    })

    const request = {
      get(name: string) {
        if (name === 'host') {
          return 'localhost:3000'
        }
        return undefined
      },
      header() {
        return undefined
      },
      protocol: 'http',
    } as const

    const result = await service.applyStartWeekFinding({
      findingId: finding.id,
      request: request as never,
      workspaceId: 'workspace-1',
    })

    expect(runtime.resume).toHaveBeenCalledWith(
      expect.stringContaining('finding-review'),
      'approved',
      expect.objectContaining({
        fleetgraphActionRequestContext: expect.objectContaining({
          baseUrl: 'http://localhost:3000',
        }),
      })
    )
    expect(result.actionExecution?.status).toBe('applied')
  })
})
