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

import fleetgraphRouter from './fleetgraph.js'

const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333'
const PROJECT_ID = '44444444-4444-4444-8444-444444444444'
const SPRINT_ID = '55555555-5555-4555-8555-555555555555'

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

describe('FleetGraph routes', () => {
  let app: express.Express
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    app = express()
    app.use(express.json())
    app.use('/api/fleetgraph', fleetgraphRouter)
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
    expect(response.body.approval).toMatchObject({
      state: 'pending_confirmation',
      targetId: DOCUMENT_ID,
      type: 'approve_project_plan',
    })
    expect(response.body.approval.options.map((option: { id: string }) => option.id))
      .toEqual(['apply', 'dismiss', 'snooze'])
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
    process.env.APP_BASE_URL = 'https://ship-demo.onrender.com'
    process.env.FLEETGRAPH_ENTRY_ENABLED = 'true'
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
      publicBaseUrl: 'https://ship-demo.onrender.com',
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
})
