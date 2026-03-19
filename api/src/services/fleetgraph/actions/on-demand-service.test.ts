import { describe, expect, it, vi } from 'vitest'

import { createFleetGraphOnDemandActionService } from './on-demand-service.js'

const ANALYSIS_THREAD_ID = 'fleetgraph:workspace-1:analyze:project-1'
const REVIEW_THREAD_ID = `${ANALYSIS_THREAD_ID}:action:start_week:week-1`
const ACTION_DRAFT = {
  actionId: 'start_week:week-1',
  actionType: 'start_week',
  contextHints: {
    endpoint: {
      method: 'POST',
      path: '/api/weeks/week-1/start',
    },
    findingFingerprint: 'finding-1',
  },
  evidence: ['The week is still planning after its expected start window.'],
  rationale: 'The week should be active by now.',
  targetId: 'week-1',
  targetType: 'sprint',
} as const

function makeAnalysisState(overrides: Record<string, unknown> = {}) {
  return {
    actionDrafts: [ACTION_DRAFT],
    activeTab: null,
    actorId: 'user-1',
    branch: 'action_required',
    contextSummary: null,
    conversationHistory: [],
    documentId: 'project-1',
    documentType: 'project',
    mode: 'on_demand',
    nestedPath: null,
    path: ['resolve_trigger_context', 'reason_findings', 'approval_interrupt'],
    pendingApproval: null,
    projectContextId: null,
    reasonedFindings: [],
    responsePayload: {
      answer: {
        entityLinks: [],
        suggestedNextSteps: ['start_week'],
        text: 'This week should be active by now.',
      },
      type: 'chat_answer',
    },
    threadId: ANALYSIS_THREAD_ID,
    triggerSource: 'document-page',
    turnCount: 1,
    viewerUserId: 'viewer-1',
    workspaceId: 'workspace-1',
    ...overrides,
  }
}

function makeApprovalInterrupt() {
  return {
    taskName: 'approval_interrupt',
    value: {
      actionDraft: ACTION_DRAFT,
      dialogSpec: {
        cancelLabel: 'Cancel',
        confirmLabel: 'Start week in Ship',
        evidence: ACTION_DRAFT.evidence,
        fields: [],
        kind: 'confirm',
        summary: 'FleetGraph thinks this week is ready to start.',
        title: 'Confirm before starting this week',
      },
      id: 'approval:finding-1:start_week:week-1',
      summary: 'FleetGraph thinks this week is ready to start.',
      title: 'Confirm before starting this week',
      type: 'approval_request',
    },
  }
}

describe('FleetGraph on-demand action service', () => {
  it('creates a review thread from an analysis thread action', async () => {
    let reviewInterruptChecks = 0
    const runtime = {
      getPendingInterrupts: vi.fn(async (threadId: string) => {
        if (threadId !== REVIEW_THREAD_ID) {
          return []
        }

        reviewInterruptChecks += 1
        return reviewInterruptChecks === 1 ? [] : [makeApprovalInterrupt()]
      }),
      getState: vi.fn(async (threadId: string) => {
        if (threadId === ANALYSIS_THREAD_ID) {
          return { values: makeAnalysisState() }
        }
        throw new Error('missing review thread')
      }),
      invoke: vi.fn(async () => makeAnalysisState({
        path: ['resolve_trigger_context', 'approval_interrupt'],
        threadId: REVIEW_THREAD_ID,
      })),
      resume: vi.fn(),
    }

    const service = createFleetGraphOnDemandActionService({
      runtime: runtime as never,
    })

    const result = await service.reviewThreadAction({
      actionId: ACTION_DRAFT.actionId,
      threadId: ANALYSIS_THREAD_ID,
      workspaceId: 'workspace-1',
    })

    expect(runtime.invoke).toHaveBeenCalledWith(expect.objectContaining({
      documentId: 'project-1',
      documentType: 'project',
      mode: 'on_demand',
      selectedActionId: ACTION_DRAFT.actionId,
      threadId: REVIEW_THREAD_ID,
      triggerSource: 'human-review',
      triggerType: 'user_chat',
      userQuestion: null,
      workspaceId: 'workspace-1',
    }), {
      threadId: REVIEW_THREAD_ID,
    })
    expect(result.actionDraft.actionId).toBe(ACTION_DRAFT.actionId)
    expect(result.dialogSpec.confirmLabel).toBe('Start week in Ship')
  })

  it('resumes review threads with structured dialog submissions', async () => {
    const runtime = {
      getPendingInterrupts: vi.fn(async (threadId: string) => (
        threadId === REVIEW_THREAD_ID ? [makeApprovalInterrupt()] : []
      )),
      getState: vi.fn(async (threadId: string) => {
        if (threadId === ANALYSIS_THREAD_ID) {
          return { values: makeAnalysisState() }
        }
        return {
          values: makeAnalysisState({
            approvalDecision: null,
            threadId: REVIEW_THREAD_ID,
          }),
        }
      }),
      invoke: vi.fn(),
      resume: vi.fn(async () => makeAnalysisState({
        actionResult: {
          endpoint: 'POST /api/weeks/week-1/start',
          errorMessage: 'Ship rejected this action.',
          executedAt: '2026-03-19T10:00:00.000Z',
          method: 'POST',
          path: '/api/weeks/week-1/start',
          statusCode: 409,
          success: false,
        },
        approvalDecision: 'approved',
        path: ['resolve_trigger_context', 'approval_interrupt', 'execute_confirmed_action'],
        threadId: REVIEW_THREAD_ID,
      })),
    }

    const service = createFleetGraphOnDemandActionService({
      runtime: runtime as never,
    })

    const result = await service.applyThreadAction({
      actionId: ACTION_DRAFT.actionId,
      submission: {
        note: 'Start it now',
      },
      threadId: ANALYSIS_THREAD_ID,
      workspaceId: 'workspace-1',
    })

    expect(runtime.resume).toHaveBeenCalledWith(REVIEW_THREAD_ID, {
      actionId: ACTION_DRAFT.actionId,
      decision: 'approved',
      dialogSubmission: {
        actionId: ACTION_DRAFT.actionId,
        values: {
          note: 'Start it now',
        },
      },
    })
    expect(result.actionResult.success).toBe(false)
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
            actionResult: {
              endpoint: 'POST /api/weeks/week-1/start',
              executedAt: '2026-03-19T10:00:00.000Z',
              method: 'POST',
              path: '/api/weeks/week-1/start',
              statusCode: 200,
              success: true,
            },
            approvalDecision: 'approved',
            path: ['resolve_trigger_context', 'approval_interrupt', 'execute_confirmed_action'],
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
      actionId: ACTION_DRAFT.actionId,
      threadId: ANALYSIS_THREAD_ID,
      workspaceId: 'workspace-1',
    })

    expect(runtime.resume).not.toHaveBeenCalled()
    expect(result.actionResult.success).toBe(true)
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
      actionId: ACTION_DRAFT.actionId,
      threadId: ANALYSIS_THREAD_ID,
      workspaceId: 'workspace-1',
    })).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
