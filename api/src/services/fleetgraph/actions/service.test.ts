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
  it('classifies an already-active Ship response as an idempotent apply outcome', async () => {
    const beginStartWeekExecution = vi.fn(async () => ({
      execution: {
        actionType: 'start_week' as const,
        attemptCount: 1,
        endpoint: {
          method: 'POST' as const,
          path: '/api/weeks/11111111-1111-4111-8111-111111111111/start',
        },
        findingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        message: 'Applying the FleetGraph recommendation.',
        status: 'pending' as const,
        updatedAt: new Date('2026-03-17T12:01:00.000Z'),
      },
      shouldExecute: true,
    }))
    const finishStartWeekExecution = vi.fn(async (input) => ({
      actionType: 'start_week' as const,
      appliedAt: input.appliedAt,
      attemptCount: 1,
      endpoint: input.endpoint,
      findingId: input.findingId,
      message: input.message,
      resultStatusCode: input.resultStatusCode,
      status: input.status,
      updatedAt: new Date('2026-03-17T12:02:00.000Z'),
    }))

    const service = createFleetGraphFindingActionService({
      actionStore: {
        beginStartWeekExecution,
        finishStartWeekExecution,
        listExecutionsForFindings: vi.fn(async () => []),
      },
      executeShipRestAction: vi.fn(async () => ({
        body: { error: 'Cannot start week: week is already active' },
        ok: false,
        status: 400,
      })),
      findingStore: {
        dismissFinding: vi.fn(),
        getFindingById: vi.fn(async () => makeFinding()),
        getFindingByKey: vi.fn(),
        listActiveFindings: vi.fn(async () => []),
        resolveFinding: vi.fn(),
        snoozeFinding: vi.fn(),
        upsertFinding: vi.fn(),
      },
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
    } as unknown as Parameters<typeof service.applyStartWeekFinding>[0]['request']

    const result = await service.applyStartWeekFinding({
      findingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      request,
      workspaceId: 'workspace-1',
    })

    expect(beginStartWeekExecution).toHaveBeenCalled()
    expect(finishStartWeekExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Week was already active when this FleetGraph action was applied.',
        status: 'already_applied',
      })
    )
    expect(result.actionExecution?.status).toBe('already_applied')
  })
})
