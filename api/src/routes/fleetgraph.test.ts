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

function createWeeklyPlanEntryPayload() {
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
          title: 'Alice plan',
          type: 'weekly_plan',
        },
      ],
      children: [],
      current: {
        document_type: 'weekly_plan',
        id: DOCUMENT_ID,
        title: 'Alice plan',
      },
    },
    route: {
      activeTab: 'details',
      nestedPath: [],
      surface: 'document-page',
    },
    trigger: {
      documentId: DOCUMENT_ID,
      documentType: 'weekly_plan',
      mode: 'on_demand',
      trigger: 'document-context',
    },
  }
}

function createSprintReviewEntryPayload() {
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
      ],
      children: [],
      current: {
        document_type: 'sprint',
        id: SPRINT_ID,
        title: 'Sprint 8',
      },
    },
    route: {
      activeTab: 'review',
      nestedPath: [],
      surface: 'document-page',
    },
    trigger: {
      documentId: SPRINT_ID,
      documentType: 'sprint',
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

function createEntryPayloadWithNullableBelongsToColor() {
  const payload = createEntryPayload()
  return {
    ...payload,
    context: {
      ...payload.context,
      belongs_to: payload.context.belongs_to.map((entry, index) => (
        index === 0
          ? { ...entry, color: null }
          : entry
      )),
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
      analysisFindings: input.requestedAction
        ? []
        : [
          {
            actionTier: 'A',
            evidence: ['Launch planner has no milestones scoped yet.'],
            findingType: 'risk',
            severity: 'warning',
            summary: 'The page still needs concrete milestones before execution.',
            title: 'Planning detail is still thin',
          },
        ],
      analysisText: input.requestedAction
        ? ''
        : 'Launch planner still needs milestones and ownership detail before execution.',
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
  const applyFinding = vi.fn()
  const applyEntry = vi.fn()
  const reviewFinding = vi.fn()
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
    vi.useRealTimers()
    process.env = { ...originalEnv }
    ;[
      applyFinding,
      applyEntry,
      reviewFinding,
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
        applyFinding,
        attachExecutions,
        reviewFinding,
      },
      entryActionService: {
        applyEntry,
      } as never,
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
    expect(response.body.summary.title).toBe('What matters on this page')
    expect(response.body.analysis).toMatchObject({
      text: 'Launch planner still needs milestones and ownership detail before execution.',
      findings: [
        expect.objectContaining({
          severity: 'warning',
          title: 'Planning detail is still thin',
        }),
      ],
    })
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
              'You are already on the project page, so you can review the plan in context.',
              'Approving it marks this plan as ready for the team to follow.',
            ],
            rationale: 'Approve this plan when it is ready to guide the project.',
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

  it('accepts weekly-plan approval preview payloads that target the related sprint', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/entry')
      .send({
        ...createWeeklyPlanEntryPayload(),
        draft: {
          requestedAction: {
            endpoint: {
              method: 'POST',
              path: `/api/weeks/${SPRINT_ID}/approve-plan`,
            },
            evidence: [
              'This weekly plan belongs to the current sprint context.',
              'Approving it signals that the team can move forward with this week.',
            ],
            rationale: 'Approve this week plan when the team is ready to move forward.',
            summary: 'Approve the current week plan.',
            targetId: SPRINT_ID,
            targetType: 'sprint',
            title: 'Approve week plan',
            type: 'approve_week_plan',
          },
        },
      })

    expect(response.status).toBe(200)
    expect(response.body.run.outcome).toBe('approval_required')
    expect(response.body.approval).toMatchObject({
      targetId: SPRINT_ID,
      targetType: 'sprint',
      title: 'Approve week plan',
      type: 'approve_week_plan',
    })
  })

  it('accepts sprint-review validation payloads with a review write body', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/entry')
      .send({
        ...createSprintReviewEntryPayload(),
        draft: {
          requestedAction: {
            body: {
              plan_validated: true,
            },
            endpoint: {
              method: 'PATCH',
              path: `/api/weeks/${SPRINT_ID}/review`,
            },
            evidence: [
              'You are already on the week review, so the result stays visible on this page.',
              'Marking the plan as validated updates Plan Validation to show Validated.',
            ],
            rationale: 'Validate the week plan when the review shows the plan held up in practice.',
            summary: 'Mark the current week plan as validated in the review.',
            targetId: SPRINT_ID,
            targetType: 'sprint',
            title: 'Validate week plan',
            type: 'validate_week_plan',
          },
        },
      })

    expect(response.status).toBe(200)
    expect(response.body.run.outcome).toBe('approval_required')
    expect(response.body.approval).toMatchObject({
      body: {
        plan_validated: true,
      },
      endpoint: {
        method: 'PATCH',
        path: `/api/weeks/${SPRINT_ID}/review`,
      },
      targetId: SPRINT_ID,
      targetType: 'sprint',
      title: 'Validate week plan',
      type: 'validate_week_plan',
    })
  })

  it('routes entry apply through the FleetGraph runtime-backed service', async () => {
    applyEntry.mockResolvedValue({
      actionOutcome: {
        message: 'Project plan approved in Ship.',
        resultStatusCode: 200,
        status: 'applied',
      },
      run: {
        branch: 'approval_required',
        outcome: 'approval_required',
        path: [
          'resolve_trigger_context',
          'select_scenarios',
          'approval_interrupt',
          'execute_action',
          'persist_action_outcome',
        ],
        routeSurface: 'document-page',
        threadId: 'fleetgraph:workspace-1:entry-thread',
      },
      summary: {
        detail: 'Project plan approved in Ship.',
        surfaceLabel: 'document-page',
        title: 'FleetGraph completed the action.',
      },
    })

    const response = await request(app)
      .post('/api/fleetgraph/entry/apply')
      .send({ threadId: 'fleetgraph:workspace-1:entry-thread' })

    expect(response.status).toBe(200)
    expect(applyEntry).toHaveBeenCalledWith(
      { threadId: 'fleetgraph:workspace-1:entry-thread' },
      expect.objectContaining({
        workspaceId: '22222222-2222-4222-8222-222222222222',
        request: expect.objectContaining({
          protocol: 'http',
        }),
      })
    )
    expect(response.body.actionOutcome).toMatchObject({
      message: 'Project plan approved in Ship.',
      status: 'applied',
    })
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

  it('accepts nullable belongs_to metadata from the live document context payload', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/entry')
      .send(createEntryPayloadWithNullableBelongsToColor())

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
    listActiveFindings.mockResolvedValue([
      makeFinding(),
      makeFinding({
        dedupeKey: 'dedupe-2',
        documentId: SPRINT_ID,
        evidence: ['Sprint 8 is active but has no owner assigned.'],
        findingKey: `sprint-no-owner:workspace:${SPRINT_ID}`,
        findingType: 'sprint_no_owner',
        id: 'finding-2',
        summary: 'Sprint 8 needs a named owner.',
        title: 'Sprint owner gap: Sprint 8',
      }),
      makeFinding({
        dedupeKey: 'dedupe-3',
        documentId: SPRINT_ID,
        evidence: ['3 of 5 issues in Sprint 8 still have no assignee.'],
        findingKey: `unassigned-issues:workspace:${SPRINT_ID}`,
        findingType: 'unassigned_sprint_issues',
        id: 'finding-3',
        summary: 'Sprint 8 has several unassigned issues.',
        title: '3 unassigned issues in Sprint 8',
      }),
    ])

    const response = await request(app)
      .get(`/api/fleetgraph/findings?documentIds=${DOCUMENT_ID},${SPRINT_ID}`)

    expect(response.status).toBe(200)
    expect(response.body.findings).toHaveLength(3)
    expect(response.body.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: DOCUMENT_ID,
          findingType: 'week_start_drift',
          status: 'active',
        }),
        expect.objectContaining({
          documentId: SPRINT_ID,
          findingType: 'sprint_no_owner',
          status: 'active',
          title: 'Sprint owner gap: Sprint 8',
        }),
        expect.objectContaining({
          documentId: SPRINT_ID,
          findingType: 'unassigned_sprint_issues',
          status: 'active',
          title: '3 unassigned issues in Sprint 8',
        }),
      ])
    )
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
    applyFinding.mockResolvedValue(
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
    expect(applyFinding).toHaveBeenCalledWith({
      actorUserId: '11111111-1111-4111-8111-111111111111',
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
    reviewFinding.mockResolvedValue({
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
    expect(reviewFinding).toHaveBeenCalledWith({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      findingId: 'finding-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
    })
    expect(response.body.review).toMatchObject({
      confirmLabel: 'Start week in Ship',
      threadId: 'fleetgraph:workspace-1:finding-review:finding-1:start-week',
      title: 'Confirm before starting this week',
    })
  })

  it('returns a server-backed review payload for assign-owner findings', async () => {
    reviewFinding.mockResolvedValue({
      finding: makeFinding({
        findingKey: 'sprint-no-owner:workspace-1:sprint-8',
        findingType: 'sprint_no_owner',
        id: 'finding-owner-gap',
        recommendedAction: {
          body: {
            owner_id: '11111111-1111-4111-8111-111111111111',
          },
          endpoint: {
            method: 'PATCH',
            path: `/api/documents/${SPRINT_ID}`,
          },
          evidence: ['No sprint owner is assigned right now.'],
          rationale: 'Assigning accountability should stay a human-reviewed action.',
          summary: 'Assign yourself as sprint owner so someone is accountable for coordination and follow-through.',
          targetId: SPRINT_ID,
          targetType: 'sprint',
          title: 'Assign sprint owner',
          type: 'assign_owner',
        },
        summary: 'Sprint 8 needs a named owner before work coordination slips.',
        title: 'Sprint owner gap: Sprint 8',
      }),
      review: {
        cancelLabel: 'Cancel',
        confirmLabel: 'Assign owner in Ship',
        evidence: [
          'No sprint owner is assigned right now.',
          'FleetGraph will assign the person you selected in Ship when you confirm.',
        ],
        summary: 'FleetGraph will assign the person you selected in Ship so someone is explicitly accountable for coordination and follow-through.',
        threadId: 'fleetgraph:workspace-1:finding-review:finding-owner-gap:assign-owner',
        title: 'Confirm before assigning sprint owner',
      },
    })

    const response = await request(app)
      .post('/api/fleetgraph/findings/finding-owner-gap/review')
      .send({
        ownerId: '22222222-2222-4222-8222-222222222222',
      })

    expect(response.status).toBe(200)
    expect(reviewFinding).toHaveBeenCalledWith({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      findingId: 'finding-owner-gap',
      ownerId: '22222222-2222-4222-8222-222222222222',
      workspaceId: '22222222-2222-4222-8222-222222222222',
    })
    expect(response.body.review).toMatchObject({
      confirmLabel: 'Assign owner in Ship',
      title: 'Confirm before assigning sprint owner',
    })
  })

  it('applies an assign-owner finding through the FleetGraph action route', async () => {
    const actionExecution: FleetGraphFindingActionExecutionRecord = {
      actionType: 'assign_owner',
      appliedAt: new Date('2026-03-17T12:05:00.000Z'),
      attemptCount: 1,
      endpoint: {
        method: 'PATCH',
        path: `/api/documents/${SPRINT_ID}`,
      },
      findingId: 'finding-owner-gap',
      message: 'Sprint owner assigned in Ship. Look for Owner showing the person you selected on this page.',
      resultStatusCode: 200,
      status: 'applied',
      updatedAt: new Date('2026-03-17T12:05:00.000Z'),
    }
    applyFinding.mockResolvedValue(
      makeFinding({
        actionExecution,
        findingKey: 'sprint-no-owner:workspace-1:sprint-8',
        findingType: 'sprint_no_owner',
        id: 'finding-owner-gap',
        recommendedAction: {
          body: {
            owner_id: '11111111-1111-4111-8111-111111111111',
          },
          endpoint: actionExecution.endpoint,
          evidence: ['No sprint owner is assigned right now.'],
          rationale: 'Assigning accountability should stay a human-reviewed action.',
          summary: 'Assign yourself as sprint owner so someone is accountable for coordination and follow-through.',
          targetId: SPRINT_ID,
          targetType: 'sprint',
          title: 'Assign sprint owner',
          type: 'assign_owner',
        },
        summary: 'Sprint 8 needs a named owner before work coordination slips.',
        title: 'Sprint owner gap: Sprint 8',
      })
    )

    const response = await request(app)
      .post('/api/fleetgraph/findings/finding-owner-gap/apply')
      .set('x-csrf-token', 'csrf-token')
      .send({
        ownerId: '22222222-2222-4222-8222-222222222222',
      })

    expect(response.status).toBe(200)
    expect(applyFinding).toHaveBeenCalledWith({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      findingId: 'finding-owner-gap',
      ownerId: '22222222-2222-4222-8222-222222222222',
      request: expect.any(Object),
      workspaceId: '22222222-2222-4222-8222-222222222222',
    })
    expect(response.body.finding.actionExecution).toMatchObject({
      actionType: 'assign_owner',
      status: 'applied',
    })
  })

  it('passes the current Ship request context into on-demand analysis reads', async () => {
    const response = await request(app)
      .post('/api/fleetgraph/analyze')
      .set('cookie', 'ship_session=demo')
      .set('host', 'ship-demo-production.up.railway.app')
      .set('x-csrf-token', 'csrf-token')
      .set('x-forwarded-proto', 'https')
      .send({
        documentId: DOCUMENT_ID,
        documentTitle: 'Launch planner',
        documentType: 'project',
      })

    expect(response.status).toBe(200)
    expect(runtime.invoke).toHaveBeenCalledWith(expect.objectContaining({
      contextKind: 'entry',
      documentId: DOCUMENT_ID,
      documentTitle: 'Launch planner',
      documentType: 'project',
      mode: 'on_demand',
      threadId: `fleetgraph:22222222-2222-4222-8222-222222222222:analyze:${DOCUMENT_ID}`,
    }), {
      fleetgraphReadRequestContext: {
        baseUrl: 'https://ship-demo-production.up.railway.app',
        cookieHeader: 'ship_session=demo',
        csrfToken: 'csrf-token',
      },
    })
  })

  it('passes follow-up user messages into the on-demand graph turn', async () => {
    runtime.getState.mockResolvedValueOnce({
      values: {
        documentId: DOCUMENT_ID,
        documentTitle: 'Launch planner',
        documentType: 'project',
      },
    })

    const response = await request(app)
      .post('/api/fleetgraph/thread/fleetgraph%3Athread-1/turn')
      .set('cookie', 'ship_session=demo')
      .set('host', 'ship-demo-production.up.railway.app')
      .set('x-csrf-token', 'csrf-token')
      .set('x-forwarded-proto', 'https')
      .send({
        message: 'What else should I look at?',
      })

    expect(response.status).toBe(200)
    expect(runtime.invoke).toHaveBeenCalledWith(expect.objectContaining({
      contextKind: 'entry',
      documentId: DOCUMENT_ID,
      documentTitle: 'Launch planner',
      documentType: 'project',
      mode: 'on_demand',
      threadId: 'fleetgraph:thread-1',
      userMessage: 'What else should I look at?',
    }), {
      fleetgraphReadRequestContext: {
        baseUrl: 'https://ship-demo-production.up.railway.app',
        cookieHeader: 'ship_session=demo',
        csrfToken: 'csrf-token',
      },
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
        applyFinding,
        attachExecutions,
        reviewFinding,
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

  it('accepts second-level snoozes for demo flows', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-17T12:00:00.000Z'))

    snoozeFinding.mockResolvedValue(
      makeFinding({
        snoozedUntil: new Date('2026-03-17T12:00:10.000Z'),
        status: 'snoozed',
        summary: 'Snoozed summary',
      })
    )

    const response = await request(app)
      .post('/api/fleetgraph/findings/finding-1/snooze')
      .send({ seconds: 10 })

    expect(response.status).toBe(200)
    expect(snoozeFinding).toHaveBeenCalledWith(
      'finding-1',
      '22222222-2222-4222-8222-222222222222',
      new Date('2026-03-17T12:00:10.000Z')
    )
  })
})
