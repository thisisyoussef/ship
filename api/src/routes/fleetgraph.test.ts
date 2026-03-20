import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn((req, _res, next) => {
    req.userId = '11111111-1111-4111-8111-111111111111'
    req.workspaceId = '22222222-2222-4222-8222-222222222222'
    next()
  }),
}))

import { createFleetGraphRouter } from './fleetgraph.js'

const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222'
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333'
const THREAD_ID = `fleetgraph:${WORKSPACE_ID}:analyze:${DOCUMENT_ID}`

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    actionDrafts: [
      {
        actionId: 'start_week:week-1',
        actionType: 'start_week',
        contextHints: {
          endpoint: {
            method: 'POST',
            path: '/api/weeks/week-1/start',
          },
          findingFingerprint: 'finding-1',
        },
        evidence: ['hoursSinceStart: 30'],
        rationale: 'The week is overdue and still planning.',
        targetId: 'week-1',
        targetType: 'sprint',
      },
    ],
    analysisNarrative: 'The week is overdue and still planning.',
    branch: 'action_required',
    contextSummary: null,
    conversationHistory: [],
    path: ['resolve_trigger_context', 'reason_findings', 'approval_interrupt'],
    reasonedFindings: [
      {
        evidence: ['hoursSinceStart: 30'],
        explanation: 'This week is overdue and still planning.',
        findingType: 'week_start_drift',
        fingerprint: 'finding-1',
        severity: 'warning',
        targetEntity: {
          id: 'week-1',
          name: 'Week 1',
          type: 'sprint',
        },
        title: 'Week is still in planning',
      },
    ],
    responsePayload: {
      answer: {
        entityLinks: [],
        suggestedNextSteps: ['start_week'],
        text: 'The week is overdue and still planning.',
      },
      type: 'chat_answer',
    },
    fallbackStage: null,
    threadId: THREAD_ID,
    turnCount: 1,
    workspaceId: WORKSPACE_ID,
    ...overrides,
  }
}

describe('FleetGraph native V2 routes', () => {
  let app: express.Express
  let runtimeV2: {
    getCheckpointHistory: ReturnType<typeof vi.fn>
    getPendingInterrupts: ReturnType<typeof vi.fn>
    getState: ReturnType<typeof vi.fn>
    invoke: ReturnType<typeof vi.fn>
    resume: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    process.env = { ...process.env }
    delete process.env.FLEETGRAPH_V2_ENABLED

    runtimeV2 = {
      getCheckpointHistory: vi.fn(async () => []),
      getPendingInterrupts: vi.fn(async () => [{
        taskName: 'approval_interrupt',
        value: {
          actionDraft: makeState().actionDrafts[0],
          dialogSpec: {
            cancelLabel: 'Cancel',
            confirmLabel: 'Start week',
            evidence: ['hoursSinceStart: 30'],
            fields: [],
            kind: 'confirm',
            summary: 'This week has passed its planned start, but Ship still lists it as Planning. Starting it now will unlock issue tracking and standups for the team.',
            title: 'Start this week in Ship?',
          },
          id: 'approval:finding-1:start_week:week-1',
          summary: 'This week has passed its planned start, but Ship still lists it as Planning. Starting it now will unlock issue tracking and standups for the team.',
          title: 'Start this week in Ship?',
          type: 'approval_request',
        },
      }]),
      getState: vi.fn(async () => ({
        tasks: [],
        values: makeState(),
      })),
      invoke: vi.fn(async () => makeState()),
      resume: vi.fn(async () => makeState({
        actionResult: {
          endpoint: 'POST /api/weeks/week-1/start',
          executedAt: '2026-03-19T10:00:00.000Z',
          method: 'POST',
          path: '/api/weeks/week-1/start',
          statusCode: 200,
          success: true,
        },
        approvalDecision: 'approved',
        branch: 'advisory',
        path: ['resolve_trigger_context', 'approval_interrupt', 'execute_confirmed_action'],
        responsePayload: {
          answer: {
            entityLinks: [],
            suggestedNextSteps: [],
            text: 'Week "Week 1" is now active in Ship.',
          },
          type: 'chat_answer',
        },
      })),
    }

    app = express()
    app.use(express.json())
    app.use('/api/fleetgraph', createFleetGraphRouter({
      runtimeV2: runtimeV2 as never,
    }))
  })

  it('reports readiness using the actual V2 default-enabled behavior', async () => {
    process.env.FLEETGRAPH_SERVICE_TOKEN = 'service-token'

    const response = await request(app)
      .get('/api/fleetgraph/ready')
      .set('x-fleetgraph-service-token', 'service-token')

    expect(response.status).toBe(503)
    expect(response.body.v2.enabled).toBe(true)
  })

  it('returns the native V2 analyze contract', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/analyze')
      .send({
        documentId: DOCUMENT_ID,
        documentType: 'project',
      })

    expect(response.status).toBe(200)
    expect(response.body.branch).toBe('action_required')
    expect(response.body.responsePayload.type).toBe('chat_answer')
    expect(response.body.actionDrafts[0].actionId).toBe('start_week:week-1')
    expect(response.body.pendingApproval.actionDraft.actionId).toBe('start_week:week-1')
  })

  it('surfaces fallback stage metadata in the analyze response', async () => {
    runtimeV2.invoke.mockResolvedValueOnce(makeState({
      actionDrafts: [],
      branch: 'fallback',
      fallbackReason: 'FleetGraph could not load the current Ship document.',
      fallbackStage: 'fetch',
      pendingApproval: null,
      reasonedFindings: [],
      responsePayload: {
        disclaimer: 'Some Ship data was unavailable, so this answer may be incomplete.',
        type: 'degraded',
      },
    }))
    runtimeV2.getPendingInterrupts.mockResolvedValueOnce([])

    const response = await request(app)
      .post('/api/fleetgraph/analyze')
      .send({
        documentId: DOCUMENT_ID,
        documentType: 'project',
      })

    expect(response.status).toBe(200)
    expect(response.body.branch).toBe('fallback')
    expect(response.body.fallbackStage).toBe('fetch')
    expect(response.body.responsePayload.type).toBe('degraded')
  })

  it('routes follow-up turns through V2 with the user question', async () => {
    runtimeV2.getState.mockResolvedValueOnce({
      tasks: [],
      values: makeState({
        documentId: DOCUMENT_ID,
        documentType: 'project',
        triggerSource: 'document-page',
      }),
    })

    const response = await request(app)
      .post(`/api/fleetgraph/thread/${encodeURIComponent(THREAD_ID)}/turn`)
      .send({ message: 'What is the riskiest thing here?' })

    expect(response.status).toBe(200)
    expect(runtimeV2.invoke).toHaveBeenCalledWith(expect.objectContaining({
      documentId: DOCUMENT_ID,
      selectedActionId: null,
      threadId: THREAD_ID,
      userQuestion: 'What is the riskiest thing here?',
    }), { threadId: THREAD_ID })
    expect(response.body.turnCount).toBe(1)
  })

  it('returns native V2 review payloads for thread actions', async () => {
    const response = await request(app)
      .post(`/api/fleetgraph/thread/${encodeURIComponent(THREAD_ID)}/actions/start_week%3Aweek-1/review`)
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.actionDraft.actionId).toBe('start_week:week-1')
    expect(response.body.dialogSpec.kind).toBe('confirm')
    expect(response.body.threadId).toBe(`${THREAD_ID}:action:start_week:week-1`)
  })

  it('applies native V2 thread actions with structured values', async () => {
    const response = await request(app)
      .post(`/api/fleetgraph/thread/${encodeURIComponent(THREAD_ID)}/actions/start_week%3Aweek-1/apply`)
      .send({
        values: {},
      })

    expect(response.status).toBe(200)
    expect(runtimeV2.resume).toHaveBeenCalledWith(
      `${THREAD_ID}:action:start_week:week-1`,
      {
        actionId: 'start_week:week-1',
        decision: 'approved',
        dialogSubmission: {
          actionId: 'start_week:week-1',
          values: {},
        },
      },
    )
    expect(response.body.actionResult.success).toBe(true)
  })
})
