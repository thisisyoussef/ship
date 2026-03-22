import { describe, expect, it, vi } from 'vitest'

import {
  createFleetGraphEntryActionService,
  FleetGraphEntryActionError,
} from './action-service.js'

function makePendingEntryState() {
  return {
    approvalRequired: true,
    branch: 'approval_required' as const,
    candidateCount: 1,
    checkpointNamespace: 'fleetgraph' as const,
    contextKind: 'entry' as const,
    hasError: false,
    mode: 'on_demand' as const,
    outcome: 'approval_required' as const,
    path: [
      'resolve_trigger_context',
      'select_scenarios',
      'approval_interrupt',
    ],
    requestedAction: {
      endpoint: {
        method: 'POST' as const,
        path: '/api/projects/project-1/approve-plan',
      },
      evidence: ['Project plan is ready for review.'],
      rationale: 'Approve this plan when it is ready to guide the project.',
      summary: 'Approve the current project plan.',
      targetId: 'project-1',
      targetType: 'project' as const,
      title: 'Approve project plan',
      type: 'approve_project_plan' as const,
    },
    routeSurface: 'document-page',
    scenarioResults: [],
    selectedAction: {
      endpoint: {
        method: 'POST' as const,
        path: '/api/projects/project-1/approve-plan',
      },
      evidence: ['Project plan is ready for review.'],
      rationale: 'Approve this plan when it is ready to guide the project.',
      summary: 'Approve the current project plan.',
      targetId: 'project-1',
      targetType: 'project' as const,
      title: 'Approve project plan',
      type: 'approve_project_plan' as const,
    },
    threadId: 'fleetgraph:workspace-1:entry-thread',
    trigger: 'document-context' as const,
    workspaceId: 'workspace-1',
  }
}

describe('FleetGraph entry action service', () => {
  it('resumes a pending entry approval with the current request context', async () => {
    const runtime = {
      getPendingInterrupts: vi.fn(async () => [{ taskName: 'approval_interrupt' }]),
      getState: vi.fn(async () => ({
        values: makePendingEntryState(),
      })),
      resume: vi.fn(async () => ({
        ...makePendingEntryState(),
        actionOutcome: {
          message: 'Project plan approved in Ship.',
          resultStatusCode: 200,
          status: 'applied' as const,
        },
        path: [
          'resolve_trigger_context',
          'approval_interrupt',
          'execute_action',
          'persist_action_outcome',
        ],
      })),
    }

    const service = createFleetGraphEntryActionService({
      runtime,
    })

    const response = await service.applyEntry(
      { threadId: 'fleetgraph:workspace-1:entry-thread' },
      {
        request: {
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
        } as never,
        workspaceId: 'workspace-1',
      }
    )

    expect(runtime.resume).toHaveBeenCalledWith(
      'fleetgraph:workspace-1:entry-thread',
      'approved',
      expect.objectContaining({
        fleetgraphActionRequestContext: expect.objectContaining({
          baseUrl: 'http://localhost:3000',
        }),
      })
    )
    expect(response.actionOutcome).toMatchObject({
      message: 'Project plan approved in Ship.',
      status: 'applied',
    })
    expect(response.summary.title).toBe('FleetGraph completed the action.')
  })

  it('rejects entry apply when no approval interrupt is pending', async () => {
    const runtime = {
      getPendingInterrupts: vi.fn(async () => []),
      getState: vi.fn(async () => ({
        values: makePendingEntryState(),
      })),
      resume: vi.fn(),
    }

    const service = createFleetGraphEntryActionService({
      runtime,
    })

    await expect(() => service.applyEntry(
      { threadId: 'fleetgraph:workspace-1:entry-thread' },
      {
        request: {
          get() {
            return 'localhost:3000'
          },
          header() {
            return undefined
          },
          protocol: 'http',
        } as never,
        workspaceId: 'workspace-1',
      }
    )).rejects.toMatchObject({
      message: 'This FleetGraph approval is no longer waiting for confirmation',
      statusCode: 409,
    } satisfies Partial<FleetGraphEntryActionError>)
    expect(runtime.resume).not.toHaveBeenCalled()
  })
})
