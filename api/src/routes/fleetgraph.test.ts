import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemorySaver } from '@langchain/langgraph'

import type { FleetGraphFindingActionExecutionRecord } from '../services/fleetgraph/actions/index.js'
import type {
  FleetGraphFindingRecord,
  FleetGraphFindingStore,
} from '../services/fleetgraph/findings/index.js'

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn((req, _res, next) => {
    req.userId = '11111111-1111-4111-8111-111111111111'
    req.workspaceId = '22222222-2222-4222-8222-222222222222'
    next()
  }),
}))

import { createFleetGraphRouter } from './fleetgraph.js'

const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333'
const PROJECT_ID = '44444444-4444-4444-8444-444444444444'
const SPRINT_ID = '55555555-5555-4555-8555-555555555555'

function makeFinding(
  overrides: Partial<FleetGraphFindingRecord> = {}
): FleetGraphFindingRecord {
  return {
    dedupeKey: 'dedupe-1',
    documentId: DOCUMENT_ID,
    documentType: 'sprint',
    evidence: ['Week is still planning after the start window.'],
    findingKey: `week-start-drift:workspace:${DOCUMENT_ID}`,
    findingType: 'week_start_drift',
    id: 'finding-1',
    metadata: {},
    status: 'active',
    summary: 'Current week still needs to be started.',
    threadId: 'fleetgraph:workspace-1:scheduled-sweep',
    title: 'Week start drift: Sprint 8',
    updatedAt: new Date('2026-03-17T12:00:00.000Z'),
    workspaceId: '22222222-2222-4222-8222-222222222222',
    ...overrides,
  }
}

function createEntryPayload() {
  return {
    context: {
      ancestors: [],
      belongs_to: [
        {
          document_type: 'project',
          id: PROJECT_ID,
          title: 'North Star',
          type: 'project',
        },
        {
          document_type: 'sprint',
          id: SPRINT_ID,
          title: 'Sprint 8',
          type: 'sprint',
        },
      ],
      breadcrumbs: [
        {
          id: PROJECT_ID,
          title: 'North Star',
          type: 'project',
        },
        {
          id: SPRINT_ID,
          title: 'Sprint 8',
          type: 'sprint',
        },
        {
          id: DOCUMENT_ID,
          title: 'Launch planner',
          type: 'project',
        },
      ],
      children: [],
      current: {
        document_type: 'project',
        id: DOCUMENT_ID,
        program_id: '66666666-6666-4666-8666-666666666666',
        ticket_number: 18,
        title: 'Launch planner',
      },
    },
    route: {
      activeTab: 'details',
      nestedPath: ['milestones'],
      surface: 'document-page',
    },
    trigger: {
      documentId: DOCUMENT_ID,
      documentType: 'project',
      mode: 'on_demand',
      trigger: 'document-context',
    },
  }
}

function createEntryPayloadWithNullableTicketNumbers() {
  const payload = createEntryPayload()
  return {
    ...payload,
    context: {
      ...payload.context,
      breadcrumbs: payload.context.breadcrumbs.map((crumb, index) => (
        index === payload.context.breadcrumbs.length - 1
          ? { ...crumb, ticket_number: null }
          : crumb
      )),
      current: {
        ...payload.context.current,
        ticket_number: null,
      },
    },
  }
}

function createEntryPayloadWithNullableProgramContext() {
  const payload = createEntryPayload()
  return {
    ...payload,
    context: {
      ...payload.context,
      current: {
        ...payload.context.current,
        program_color: null,
        program_id: null,
        program_name: null,
      },
    },
  }
}

describe('FleetGraph routes', () => {
  let app: express.Express
  const runtime = {
    checkpointer: new MemorySaver(),
    checkpointerKind: 'memory',
    getCheckpointHistory: vi.fn(async () => []),
    getPendingInterrupts: vi.fn(async () => []),
    getState: vi.fn(),
    invoke: vi.fn(async (input: {
      contextKind: 'entry'
      mode: 'on_demand'
      requestedAction?: unknown
      routeSurface: string
      threadId: string
    }) => ({
      approvalRequired: Boolean(input.requestedAction),
      branch: input.requestedAction ? 'approval_required' : 'reasoned',
      candidateCount: input.requestedAction ? 1 : 0,
      checkpointNamespace: 'fleetgraph',
      contextKind: input.contextKind,
      hasError: false,
      mode: input.mode,
      outcome: input.requestedAction ? 'approval_required' : 'advisory',
      path: input.requestedAction
        ? [
          'resolve_trigger_context',
          'select_scenarios',
          'run_scenario:entry_requested_action',
          'merge_candidates',
          'score_and_rank',
          'approval_interrupt',
        ]
        : [
          'resolve_trigger_context',
          'select_scenarios',
          'run_scenario:entry_context_check',
          'merge_candidates',
          'score_and_rank',
          'reason_and_deliver',
          'persist_result',
        ],
      routeSurface: input.routeSurface,
      scenarioResults: [],
      threadId: input.threadId,
      trigger: 'document-context',
      workspaceId: '22222222-2222-4222-8222-222222222222',
    })),
    invokeRaw: vi.fn(),
    resume: vi.fn(),
  }
  const originalEnv = { ...process.env }
  const applyStartWeekFinding = vi.fn()
  const reviewStartWeekFinding = vi.fn()
  const attachExecutions = vi.fn(async (findings: FleetGraphFindingRecord[]) => findings)
  const dismissFinding = vi.fn<FleetGraphFindingStore['dismissFinding']>()
  const getFindingByKey = vi.fn<FleetGraphFindingStore['getFindingByKey']>()
  const getFindingById = vi.fn<FleetGraphFindingStore['getFindingById']>()
  const listActiveFindings = vi.fn<FleetGraphFindingStore['listActiveFindings']>(
    async () => []
  )
  const resolveFinding = vi.fn<FleetGraphFindingStore['resolveFinding']>()
  const snoozeFinding = vi.fn<FleetGraphFindingStore['snoozeFinding']>()
  const upsertFinding = vi.fn<FleetGraphFindingStore['upsertFinding']>()
  const findingStore: FleetGraphFindingStore = {
    dismissFinding,
    getFindingById,
    getFindingByKey,
    listActiveFindings,
    resolveFinding,
    snoozeFinding,
    upsertFinding,
  }

  beforeEach(() => {
    process.env = { ...originalEnv }
    ;[
      applyStartWeekFinding,
      reviewStartWeekFinding,
      attachExecutions,
      dismissFinding,
      getFindingById,
      getFindingByKey,
      listActiveFindings,
      resolveFinding,
      snoozeFinding,
      upsertFinding,
    ].forEach((mock) => {
      mock.mockReset()
    })
    listActiveFindings.mockResolvedValue([])
    attachExecutions.mockImplementation(async (findings: FleetGraphFindingRecord[]) => findings)
    app = express()
    app.use(express.json())
    app.use('/api/fleetgraph', createFleetGraphRouter({
      actionService: {
        applyStartWeekFinding,
        attachExecutions,
        reviewStartWeekFinding,
      },
      findingStore,
      runtime: runtime as never,
    }))
  })

  it('receives Ship page context for embedded entry', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/entry')
      .send(createEntryPayload())

    expect(response.status).toBe(200)
    expect(response.body.entry.current.id).toBe(DOCUMENT_ID)
    expect(response.body.entry.route.activeTab).toBe('details')
    expect(response.body.entry.route.nestedPath).toEqual(['milestones'])
    expect(response.body.run.outcome).toBe('advisory')
    expect(response.body.summary.surfaceLabel).toContain('details')
  })

  it('requires a HITL pause for consequential actions', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/entry')
      .send({
        ...createEntryPayload(),
        draft: {
          requestedAction: {
            endpoint: {
              method: 'POST',
              path: `/api/projects/${DOCUMENT_ID}/approve-plan`,
            },
            evidence: [
              'Project plan exists in the current document context.',
              'The approval endpoint changes persistent project approval state.',
            ],
            rationale: 'Approving the plan is a consequential Ship write.',
            summary: 'Approve the current project plan.',
            targetId: DOCUMENT_ID,
            targetType: 'project',
            title: 'Approve project plan',
            type: 'approve_project_plan',
          },
        },
      })

    expect(response.status).toBe(200)
    expect(response.body.run.outcome).toBe('approval_required')
    expect(response.body.summary.detail).toBe('Review the suggested next step for Launch planner.')
    expect(response.body.summary.detail).not.toContain('breadcrumb')
    expect(response.body.approval).toMatchObject({
      state: 'pending_confirmation',
      targetId: DOCUMENT_ID,
      type: 'approve_project_plan',
    })
    expect(response.body.approval.options.map((option: { id: string }) => option.id))
      .toEqual(['apply', 'dismiss', 'snooze'])
  })

  it('accepts nullable ticket numbers from the live document context payload', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/entry')
      .send(createEntryPayloadWithNullableTicketNumbers())

    expect(response.status).toBe(200)
    expect(response.body.run.outcome).toBe('advisory')
    expect(response.body.entry.current.id).toBe(DOCUMENT_ID)
  })

  it('accepts nullable program metadata from the live document context payload', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/entry')
      .send(createEntryPayloadWithNullableProgramContext())

    expect(response.status).toBe(200)
    expect(response.body.run.outcome).toBe('advisory')
    expect(response.body.entry.current.id).toBe(DOCUMENT_ID)
  })

  it('rejects readiness checks without the FleetGraph service token', async () => {
    const response = await request(app)
      .get('/api/fleetgraph/ready')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: 'FleetGraph service authorization failed',
    })
  })

  it('reports deploy readiness through the service-auth route', async () => {
    process.env.NODE_ENV = 'production'
    process.env.APP_BASE_URL = 'https://ship-demo-production.up.railway.app'
    process.env.FLEETGRAPH_ENTRY_ENABLED = 'true'
    process.env.FLEETGRAPH_API_TOKEN = 'ship_test_token'
    process.env.FLEETGRAPH_SERVICE_TOKEN = 'fleetgraph-service-token'
    process.env.FLEETGRAPH_WORKER_ENABLED = 'true'
    process.env.LANGSMITH_API_KEY = 'ls-test-key'
    process.env.LANGSMITH_TRACING = 'true'
    process.env.OPENAI_API_KEY = 'openai-test-key'

    const response = await request(app)
      .get('/api/fleetgraph/ready')
      .set('x-fleetgraph-service-token', 'fleetgraph-service-token')

    expect(response.status).toBe(200)
    expect(response.body.api).toMatchObject({
      publicBaseUrl: 'https://ship-demo-production.up.railway.app',
      ready: true,
      serviceAuthConfigured: true,
      tracingEnabled: true,
    })
    expect(response.body.worker).toMatchObject({
      ready: true,
    })
    expect(response.body.checklist.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'public-access-smoke', status: 'missing' }),
        expect.objectContaining({ id: 'trace-evidence', status: 'missing' }),
      ])
    )
  })

  it('lists active findings for the current document context', async () => {
    listActiveFindings.mockResolvedValue([makeFinding()])

    const response = await request(app)
      .get(`/api/fleetgraph/findings?documentIds=${DOCUMENT_ID},${SPRINT_ID}`)

    expect(response.status).toBe(200)
    expect(response.body.findings).toHaveLength(1)
    expect(response.body.findings[0]).toMatchObject({
      documentId: DOCUMENT_ID,
      findingType: 'week_start_drift',
      status: 'active',
    })
    expect(listActiveFindings).toHaveBeenCalledWith({
      documentIds: [DOCUMENT_ID, SPRINT_ID],
      workspaceId: '22222222-2222-4222-8222-222222222222',
    })
  })

  it('applies a start-week finding through the FleetGraph action route', async () => {
    const actionExecution: FleetGraphFindingActionExecutionRecord = {
      actionType: 'start_week',
      appliedAt: new Date('2026-03-17T12:05:00.000Z'),
      attemptCount: 1,
      endpoint: {
        method: 'POST',
        path: `/api/weeks/${SPRINT_ID}/start`,
      },
      findingId: 'finding-1',
      message: 'Week started successfully with 3 scoped issues.',
      resultStatusCode: 200,
      status: 'applied',
      updatedAt: new Date('2026-03-17T12:05:00.000Z'),
    }
    applyStartWeekFinding.mockResolvedValue(
      makeFinding({
        actionExecution,
        id: 'finding-1',
        recommendedAction: {
          endpoint: actionExecution.endpoint,
          evidence: ['Week is still in planning after the expected start date.'],
          rationale: 'Start the week after review.',
          summary: 'Start the week.',
          targetId: SPRINT_ID,
          targetType: 'sprint',
          title: 'Start week',
          type: 'start_week',
        },
      })
    )

    const response = await request(app)
      .post('/api/fleetgraph/findings/finding-1/apply')
      .set('x-csrf-token', 'csrf-token')

    expect(response.status).toBe(200)
    expect(applyStartWeekFinding).toHaveBeenCalledWith({
      findingId: 'finding-1',
      request: expect.any(Object),
      workspaceId: '22222222-2222-4222-8222-222222222222',
    })
    expect(response.body.finding.actionExecution).toMatchObject({
      message: 'Week started successfully with 3 scoped issues.',
      status: 'applied',
    })
  })

  it('returns a server-backed review payload for start-week findings', async () => {
    reviewStartWeekFinding.mockResolvedValue({
      finding: makeFinding({
        id: 'finding-1',
      }),
      review: {
        cancelLabel: 'Cancel',
        confirmLabel: 'Start week in Ship',
        evidence: ['The week is still in planning after its expected start date.'],
        summary: 'Nothing changes in Ship until the PM confirms this action.',
        threadId: 'fleetgraph:workspace-1:finding-review:finding-1:start-week',
        title: 'Confirm before starting this week',
      },
    })

    const response = await request(app)
      .post('/api/fleetgraph/findings/finding-1/review')

    expect(response.status).toBe(200)
    expect(reviewStartWeekFinding).toHaveBeenCalledWith({
      findingId: 'finding-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
    })
    expect(response.body.review).toMatchObject({
      confirmLabel: 'Start week in Ship',
      threadId: 'fleetgraph:workspace-1:finding-review:finding-1:start-week',
      title: 'Confirm before starting this week',
    })
  })

  it('returns checkpoint history and pending interrupts for requested threads', async () => {
    const debugRuntime = {
      checkpointer: new MemorySaver(),
      checkpointerKind: 'memory',
      getCheckpointHistory: vi.fn(async () => [
        {
          config: {
            configurable: {
              thread_id: 'fleetgraph:workspace-1:scheduled-sweep',
            },
          },
          createdAt: '2026-03-17T12:00:00.000Z',
          metadata: {},
          next: [],
          parentConfig: undefined,
          tasks: [],
          values: {
            branch: 'reasoned',
            outcome: 'advisory',
            path: ['resolve_trigger_context', 'reason_and_deliver'],
          },
        },
      ]),
      getPendingInterrupts: vi.fn(async () => [
        {
          id: 'interrupt-1',
          taskName: 'approval_interrupt',
          value: {
            title: 'Confirm before starting this week',
          },
        },
      ]),
      getState: vi.fn(),
      invoke: vi.fn(),
      invokeRaw: vi.fn(),
      resume: vi.fn(),
    }
    const debugApp = express()
    debugApp.use(express.json())
    debugApp.use('/api/fleetgraph', createFleetGraphRouter({
      actionService: {
        applyStartWeekFinding,
        attachExecutions,
        reviewStartWeekFinding,
      },
      findingStore,
      runtime: debugRuntime as never,
    }))

    const response = await request(debugApp)
      .get('/api/fleetgraph/debug/threads?threadIds=fleetgraph:workspace-1:scheduled-sweep')

    expect(response.status).toBe(200)
    expect(debugRuntime.getCheckpointHistory).toHaveBeenCalledWith(
      'fleetgraph:workspace-1:scheduled-sweep'
    )
    expect(response.body.threads).toEqual([
      {
        checkpoints: [
          expect.objectContaining({
            branch: 'reasoned',
            outcome: 'advisory',
            path: ['resolve_trigger_context', 'reason_and_deliver'],
            threadId: 'fleetgraph:workspace-1:scheduled-sweep',
          }),
        ],
        pendingInterrupts: [
          expect.objectContaining({
            id: 'interrupt-1',
            taskName: 'approval_interrupt',
          }),
        ],
        threadId: 'fleetgraph:workspace-1:scheduled-sweep',
      },
    ])
  })

  it('updates finding lifecycle through dismiss and snooze actions', async () => {
    dismissFinding.mockResolvedValue(
      makeFinding({
        status: 'dismissed',
        summary: 'Dismissed summary',
      })
    )
    snoozeFinding.mockResolvedValue(
      makeFinding({
        snoozedUntil: new Date('2026-03-17T16:00:00.000Z'),
        status: 'snoozed',
        summary: 'Snoozed summary',
      })
    )

    const dismissResponse = await request(app)
      .post('/api/fleetgraph/findings/finding-1/dismiss')

    expect(dismissResponse.status).toBe(200)
    expect(dismissResponse.body.finding.status).toBe('dismissed')

    const snoozeResponse = await request(app)
      .post('/api/fleetgraph/findings/finding-1/snooze')
      .send({ minutes: 120 })

    expect(snoozeResponse.status).toBe(200)
    expect(snoozeResponse.body.finding.status).toBe('snoozed')
    expect(snoozeFinding).toHaveBeenCalledWith(
      'finding-1',
      '22222222-2222-4222-8222-222222222222',
      expect.any(Date)
    )
  })
})
