import { afterEach, describe, expect, it, vi } from 'vitest'

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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a pending review without mutating Ship', async () => {
    const finding = makeFinding()
    const actionStore = {
      beginExecution: vi.fn(),
      beginStartWeekExecution: vi.fn(),
      finishExecution: vi.fn(),
      finishStartWeekExecution: vi.fn(),
      listExecutionsForFindings: vi.fn(async () => []),
    }

    const service = createFleetGraphFindingActionService({
      actionStore: actionStore as never,
      findingStore: {
        dismissFinding: vi.fn(),
        getFindingById: vi.fn(async () => finding),
        getFindingByKey: vi.fn(),
        listActiveFindings: vi.fn(async () => []),
        resolveFinding: vi.fn(),
        snoozeFinding: vi.fn(),
        upsertFinding: vi.fn(),
      },
    })

    const result = await service.reviewStartWeekFinding({
      findingId: finding.id,
      workspaceId: 'workspace-1',
    })

    expect(actionStore.beginExecution).not.toHaveBeenCalled()
    expect(result.finding.id).toBe(finding.id)
    expect(result.review.confirmLabel).toBe('Start week')
  })

  it('applies a finding action through the shared execution service', async () => {
    const finding = makeFinding()
    const executionRecord = {
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
    }
    const actionStore = {
      beginExecution: vi.fn(async () => ({
        execution: {
          ...executionRecord,
          appliedAt: undefined,
          message: 'Execution pending',
          status: 'pending' as const,
        },
        shouldExecute: true,
      })),
      beginStartWeekExecution: vi.fn(),
      finishExecution: vi.fn(async () => executionRecord),
      finishStartWeekExecution: vi.fn(),
      listExecutionsForFindings: vi.fn(async () => [executionRecord]),
    }
    const findingStore = {
      dismissFinding: vi.fn(),
      getFindingById: vi.fn(async () => finding),
      getFindingByKey: vi.fn(),
      listActiveFindings: vi.fn(async () => []),
      resolveFinding: vi.fn(),
      snoozeFinding: vi.fn(),
      upsertFinding: vi.fn(),
    }

    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        snapshot_issue_count: 3,
        status: 'active',
      }),
      ok: true,
      status: 200,
    }))
    vi.stubGlobal('fetch', fetchMock)

    const service = createFleetGraphFindingActionService({
      actionStore: actionStore as never,
      findingStore: findingStore as never,
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

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/weeks/11111111-1111-4111-8111-111111111111/start',
      expect.objectContaining({
        body: undefined,
        headers: expect.objectContaining({
          accept: 'application/json',
          'content-type': 'application/json',
        }),
        method: 'POST',
      })
    )
    expect(actionStore.beginExecution).toHaveBeenCalled()
    expect(actionStore.finishExecution).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'start_week',
      findingId: finding.id,
      message: 'The week is now active in Ship with 3 scoped issues ready to track.',
      resultStatusCode: 200,
      status: 'applied',
      workspaceId: 'workspace-1',
    }))
    expect(findingStore.resolveFinding).toHaveBeenCalledWith(finding.findingKey)
    expect(result.actionExecution?.status).toBe('applied')
  })

  it('does not resolve the finding when Ship returns 200 but the week stays planning', async () => {
    const finding = makeFinding()
    const executionRecord = {
      actionType: 'start_week' as const,
      attemptCount: 1,
      endpoint: {
        method: 'POST' as const,
        path: '/api/weeks/11111111-1111-4111-8111-111111111111/start',
      },
      findingId: finding.id,
      message: 'Ship responded, but this week is still marked Planning. Nothing changed in Ship.',
      resultStatusCode: 200,
      status: 'failed' as const,
      updatedAt: new Date('2026-03-17T12:05:00.000Z'),
    }
    const actionStore = {
      beginExecution: vi.fn(async () => ({
        execution: {
          ...executionRecord,
          message: 'Execution pending',
          status: 'pending' as const,
        },
        shouldExecute: true,
      })),
      beginStartWeekExecution: vi.fn(),
      finishExecution: vi.fn(async () => executionRecord),
      finishStartWeekExecution: vi.fn(),
      listExecutionsForFindings: vi.fn(async () => [executionRecord]),
    }
    const findingStore = {
      dismissFinding: vi.fn(),
      getFindingById: vi.fn(async () => finding),
      getFindingByKey: vi.fn(),
      listActiveFindings: vi.fn(async () => []),
      resolveFinding: vi.fn(),
      snoozeFinding: vi.fn(),
      upsertFinding: vi.fn(),
    }

    const fetchMock = vi.fn(async () => ({
      json: async () => ({ status: 'planning' }),
      ok: true,
      status: 200,
    }))
    vi.stubGlobal('fetch', fetchMock)

    const service = createFleetGraphFindingActionService({
      actionStore: actionStore as never,
      findingStore: findingStore as never,
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

    expect(actionStore.finishExecution).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Ship responded, but this week is still marked Planning. Nothing changed in Ship.',
      resultStatusCode: 200,
      status: 'failed',
    }))
    expect(findingStore.resolveFinding).not.toHaveBeenCalled()
    expect(result.actionExecution?.message).toBe(
      'Ship responded, but this week is still marked Planning. Nothing changed in Ship.'
    )
    expect(result.actionExecution?.status).toBe('failed')
  })
})
