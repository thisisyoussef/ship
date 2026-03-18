import { describe, expect, it, vi } from 'vitest'

import { createFleetGraphOnDemandActionService, FleetGraphOnDemandActionError } from './on-demand-service.js'

const ANALYSIS_THREAD_ID = 'fleetgraph:workspace-1:analyze:project-1'

function makeAnalysisState(overrides: Record<string, unknown> = {}) {
  return {
    analysisFindings: [
      {
        actionTier: 'C',
        evidence: ['The week is still planning after its expected start window.'],
        findingType: 'drift',
        proposedAction: {
          actionType: 'start_week',
          endpoint: {
            method: 'POST',
            path: '/api/weeks/week-1/start',
          },
          targetId: 'week-1',
          targetType: 'sprint',
        },
        severity: 'warning',
        summary: 'This week should be active by now.',
        title: 'Week start drift',
      },
    ],
    approvalRequired: false,
    branch: 'reasoned',
    candidateCount: 1,
    checkpointNamespace: 'fleetgraph',
    contextKind: 'entry',
    documentId: 'project-1',
    documentTitle: 'Launch planner',
    documentType: 'project',
    mode: 'on_demand',
    outcome: 'advisory',
    path: ['resolve_trigger_context', 'fetch_medium', 'reason', 'persist_result'],
    routeSurface: 'document-page',
    scenarioResults: [],
    threadId: ANALYSIS_THREAD_ID,
    trigger: 'document-context',
    workspaceId: 'workspace-1',
    ...overrides,
  }
}

describe('FleetGraph on-demand action service', () => {
  it('creates a review thread from an analysis thread action', async () => {
    const runtime = {
      getPendingInterrupts: vi.fn(async () => []),
      getState: vi.fn(async (threadId: string) => {
        if (threadId === ANALYSIS_THREAD_ID) {
          return { values: makeAnalysisState() }
        }
        throw new Error('missing review thread')
      }),
      invoke: vi.fn(async () => makeAnalysisState({
        branch: 'approval_required',
        outcome: 'approval_required',
        path: ['resolve_trigger_context', 'approval_interrupt'],
      })),
      resume: vi.fn(),
    }

    const service = createFleetGraphOnDemandActionService({
      runtime: runtime as never,
    })

    const result = await service.reviewThreadAction({
      actionId: 'start_week:week-1',
      threadId: ANALYSIS_THREAD_ID,
      workspaceId: 'workspace-1',
    })

    expect(runtime.invoke).toHaveBeenCalledWith(expect.objectContaining({
      contextKind: 'entry',
      documentId: 'project-1',
      mode: 'on_demand',
      requestedAction: expect.objectContaining({
        endpoint: {
          method: 'POST',
          path: '/api/weeks/week-1/start',
        },
        type: 'start_week',
      }),
      threadId: `${ANALYSIS_THREAD_ID}:action:start_week:week-1`,
      trigger: 'human-review',
    }))
    expect(result.action.actionId).toBe('start_week:week-1')
    expect(result.review.confirmLabel).toBe('Start week in Ship')
  })

  it('forwards the current request context when applying a thread action', async () => {
    const runtime = {
      getPendingInterrupts: vi.fn(async () => [{ taskName: 'approval_interrupt' }]),
      getState: vi.fn(async (threadId: string) => {
        if (threadId === ANALYSIS_THREAD_ID) {
          return { values: makeAnalysisState() }
        }
        return {
          values: makeAnalysisState({
            actionOutcome: undefined,
            path: ['resolve_trigger_context', 'approval_interrupt', 'execute_action'],
            threadId,
          }),
        }
      }),
      invoke: vi.fn(),
      resume: vi.fn(async () => makeAnalysisState({
        actionOutcome: {
          message: 'Week started successfully with 0 scoped issues.',
          resultStatusCode: 200,
          status: 'applied',
        },
        branch: 'approval_required',
        outcome: 'approval_required',
        path: ['resolve_trigger_context', 'approval_interrupt', 'execute_action'],
      })),
    }

    const service = createFleetGraphOnDemandActionService({
      runtime: runtime as never,
    })

    const request = {
      get(name: string) {
        if (name === 'host') {
          return 'ship-demo-production.up.railway.app'
        }
        if (name === 'x-forwarded-proto') {
          return 'https'
        }
        return undefined
      },
      header(name: string) {
        if (name === 'cookie') return 'ship_session=demo'
        if (name === 'x-csrf-token') return 'csrf-token'
        return undefined
      },
      protocol: 'http',
    } as const

    const result = await service.applyThreadAction({
      actionId: 'start_week:week-1',
      request: request as never,
      threadId: ANALYSIS_THREAD_ID,
      workspaceId: 'workspace-1',
    })

    expect(runtime.resume).toHaveBeenCalledWith(
      `${ANALYSIS_THREAD_ID}:action:start_week:week-1`,
      'approved',
      {
        fleetgraphActionRequestContext: {
          baseUrl: 'https://ship-demo-production.up.railway.app',
          cookieHeader: 'ship_session=demo',
          csrfToken: 'csrf-token',
        },
      }
    )
    expect(result.actionOutcome.status).toBe('applied')
  })

  it('returns the existing outcome when the review thread already ran', async () => {
    const runtime = {
      getPendingInterrupts: vi.fn(async () => []),
      getState: vi.fn(async (threadId: string) => {
        if (threadId === ANALYSIS_THREAD_ID) {
          return { values: makeAnalysisState() }
        }
        return {
          values: makeAnalysisState({
            actionOutcome: {
              message: 'Project plan approved in Ship.',
              resultStatusCode: 200,
              status: 'applied',
            },
            path: ['resolve_trigger_context', 'approval_interrupt', 'execute_action'],
            threadId,
          }),
        }
      }),
      invoke: vi.fn(),
      resume: vi.fn(),
    }

    const service = createFleetGraphOnDemandActionService({
      runtime: runtime as never,
    })

    const result = await service.applyThreadAction({
      actionId: 'start_week:week-1',
      request: {
        get: vi.fn(),
        header: vi.fn(),
        protocol: 'http',
      } as never,
      threadId: ANALYSIS_THREAD_ID,
      workspaceId: 'workspace-1',
    })

    expect(runtime.resume).not.toHaveBeenCalled()
    expect(result.actionOutcome.message).toBe('Project plan approved in Ship.')
  })

  it('rejects actions from a different workspace', async () => {
    const runtime = {
      getPendingInterrupts: vi.fn(),
      getState: vi.fn(async () => ({
        values: makeAnalysisState({
          workspaceId: 'workspace-2',
        }),
      })),
      invoke: vi.fn(),
      resume: vi.fn(),
    }

    const service = createFleetGraphOnDemandActionService({
      runtime: runtime as never,
    })

    await expect(service.reviewThreadAction({
      actionId: 'start_week:week-1',
      threadId: ANALYSIS_THREAD_ID,
      workspaceId: 'workspace-1',
    })).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
