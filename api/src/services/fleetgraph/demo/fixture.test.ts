import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createWorkerTestDatabase } from '../worker/test-helpers.js'
import {
  FLEETGRAPH_DEMO_OWNER_GAP_WEEK_TITLE,
  FLEETGRAPH_DEMO_PROJECT_TITLE,
  FLEETGRAPH_DEMO_VALIDATION_WEEK_TITLE,
  FLEETGRAPH_DEMO_WORKER_FINDING_TITLE,
  FLEETGRAPH_DEMO_WORKER_WEEK_TITLE,
  FLEETGRAPH_DEMO_WEEK_TITLE,
} from './constants.js'
import { ensureFleetGraphDemoProofLane } from './fixture.js'

describe('FleetGraph demo fixture', () => {
  let testDb: Awaited<ReturnType<typeof createWorkerTestDatabase>>

  beforeAll(async () => {
    testDb = await createWorkerTestDatabase()
  }, 120_000)

  afterAll(async () => {
    await testDb?.close()
  })

  it('creates seeded FleetGraph proof lanes, including an owner-gap week and a reusable validation-ready week', async () => {
    const workspaceId = '00000000-0000-4000-8000-000000000001'
    const userId = '00000000-0000-4000-8000-000000000002'
    const programId = '00000000-0000-4000-8000-000000000003'
    const now = new Date('2026-03-17T12:00:00.000Z')

    await testDb.pool.query(`TRUNCATE TABLE
      fleetgraph_finding_action_runs,
      fleetgraph_proactive_findings,
      document_associations,
      documents,
      workspace_memberships,
      users,
      workspaces
      CASCADE`)

    await testDb.pool.query(
      `INSERT INTO workspaces (id, name, sprint_start_date)
       VALUES ($1, 'Ship Workspace', '2026-03-10')`,
      [workspaceId]
    )
    await testDb.pool.query(
      `INSERT INTO users (id, email, password_hash, name, last_workspace_id)
       VALUES ($1, 'dev@ship.local', 'hash', 'Dev User', $2)`,
      [userId, workspaceId]
    )
    await testDb.pool.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [workspaceId, userId]
    )
    await testDb.pool.query(
      `INSERT INTO documents (id, workspace_id, document_type, title, properties)
       VALUES ($1, $2, 'program', 'Ship Core', '{"prefix":"SHIP"}'::jsonb)`,
      [programId, workspaceId]
    )

    const first = await ensureFleetGraphDemoProofLane(testDb.pool, {
      currentSprintNumber: 2,
      ownerEmail: 'dev@ship.local',
      ownerName: 'Dev User',
      ownerUserId: userId,
      programId,
      programName: 'Ship Core',
      workspaceId,
      workspaceSprintStartDate: '2026-03-10',
    }, now)

    expect(first.projectTitle).toBe(FLEETGRAPH_DEMO_PROJECT_TITLE)
    expect(first.weekTitle).toBe(FLEETGRAPH_DEMO_WEEK_TITLE)
    expect(first.findingTitle).toContain(FLEETGRAPH_DEMO_WEEK_TITLE)
    expect(first.ownerGapWeekTitle).toBe(FLEETGRAPH_DEMO_OWNER_GAP_WEEK_TITLE)
    expect(first.validationWeekTitle).toBe(FLEETGRAPH_DEMO_VALIDATION_WEEK_TITLE)
    expect(first.workerWeekTitle).toBe(FLEETGRAPH_DEMO_WORKER_WEEK_TITLE)
    expect(first.workerFindingTitle).toBe(FLEETGRAPH_DEMO_WORKER_FINDING_TITLE)

    const finding = await testDb.pool.query(
      `SELECT status, title, metadata
       FROM fleetgraph_proactive_findings
       WHERE workspace_id = $1`,
      [workspaceId]
    )
    expect(finding.rows).toHaveLength(2)
    expect(finding.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'active',
          title: `Week start drift: ${FLEETGRAPH_DEMO_WEEK_TITLE}`,
        }),
        expect.objectContaining({
          status: 'active',
          title: `Sprint owner gap: ${FLEETGRAPH_DEMO_OWNER_GAP_WEEK_TITLE}`,
        }),
      ])
    )

    const sweepSchedules = await testDb.pool.query(
      'SELECT workspace_id FROM fleetgraph_sweep_schedules WHERE workspace_id = $1',
      [workspaceId]
    )
    const validationReview = await testDb.pool.query(
      `SELECT d.title, d.properties
       FROM documents d
       JOIN document_associations da
         ON da.document_id = d.id
        AND da.related_id = $1
        AND da.relationship_type = 'sprint'
       WHERE d.workspace_id = $2
         AND d.document_type = 'weekly_review'`,
      [first.validationWeekId, workspaceId]
    )
    const queueJobs = await testDb.pool.query(
      `SELECT status, trigger, route_surface
       FROM fleetgraph_queue_jobs
       WHERE workspace_id = $1`,
      [workspaceId]
    )
    expect(sweepSchedules.rows).toHaveLength(1)
    expect(validationReview.rows).toEqual([
      {
        properties: {
          owner_id: userId,
          plan_validated: null,
          sprint_id: first.validationWeekId,
        },
        title: 'Week 2 Review',
      },
    ])
    expect(queueJobs.rows).toEqual([
      {
        route_surface: 'workspace-sweep',
        status: 'queued',
        trigger: 'scheduled-sweep',
      },
    ])

    await testDb.pool.query(
      `INSERT INTO fleetgraph_finding_action_runs (
         finding_id,
         workspace_id,
         action_type,
         endpoint_method,
         endpoint_path,
         status,
         outcome_message,
         attempt_count,
         updated_at
       )
       SELECT id, workspace_id, 'start_week', 'POST', '/api/weeks/demo/start', 'applied', 'old', 1, NOW()
       FROM fleetgraph_proactive_findings
       WHERE workspace_id = $1`,
      [workspaceId]
    )

    await ensureFleetGraphDemoProofLane(testDb.pool, {
      currentSprintNumber: 2,
      ownerEmail: 'dev@ship.local',
      ownerName: 'Dev User',
      ownerUserId: userId,
      programId,
      programName: 'Ship Core',
      workspaceId,
      workspaceSprintStartDate: '2026-03-10',
    }, now)

    const rerunFinding = await testDb.pool.query(
      'SELECT id, status FROM fleetgraph_proactive_findings WHERE workspace_id = $1',
      [workspaceId]
    )
    const actionRuns = await testDb.pool.query(
      'SELECT * FROM fleetgraph_finding_action_runs WHERE workspace_id = $1',
      [workspaceId]
    )
    const rerunQueueJobs = await testDb.pool.query(
      'SELECT status FROM fleetgraph_queue_jobs WHERE workspace_id = $1',
      [workspaceId]
    )
    const documents = await testDb.pool.query(
      `SELECT title, document_type, properties
       FROM documents
       WHERE workspace_id = $1
         AND title = ANY($2::text[])`,
      [
        workspaceId,
        [
          FLEETGRAPH_DEMO_PROJECT_TITLE,
          FLEETGRAPH_DEMO_WEEK_TITLE,
          FLEETGRAPH_DEMO_OWNER_GAP_WEEK_TITLE,
          FLEETGRAPH_DEMO_VALIDATION_WEEK_TITLE,
          FLEETGRAPH_DEMO_WORKER_WEEK_TITLE,
        ],
      ]
    )

    expect(rerunFinding.rows).toHaveLength(2)
    expect(actionRuns.rows).toHaveLength(0)
    expect(rerunQueueJobs.rows).toEqual([{ status: 'queued' }])
    expect(documents.rows).toHaveLength(5)
    expect(
      documents.rows.find((row) => row.title === FLEETGRAPH_DEMO_WEEK_TITLE)?.properties
    ).toMatchObject({
      project_id: first.projectId,
      sprint_number: 2,
      status: 'planning',
    })
    expect(
      documents.rows.find((row) => row.title === FLEETGRAPH_DEMO_OWNER_GAP_WEEK_TITLE)?.properties
    ).toMatchObject({
      owner_id: null,
      project_id: first.projectId,
      sprint_number: 2,
      status: 'active',
    })
    expect(
      documents.rows.find((row) => row.title === FLEETGRAPH_DEMO_VALIDATION_WEEK_TITLE)?.properties
    ).toMatchObject({
      project_id: first.projectId,
      sprint_number: 2,
      status: 'active',
    })
    expect(
      documents.rows.find((row) => row.title === FLEETGRAPH_DEMO_WORKER_WEEK_TITLE)?.properties
    ).toMatchObject({
      project_id: first.projectId,
      sprint_number: 2,
      status: 'planning',
    })

    const workerFinding = await testDb.pool.query(
      'SELECT * FROM fleetgraph_proactive_findings WHERE finding_key = $1',
      [`week-start-drift:${workspaceId}:${first.workerWeekId}`]
    )
    const rerunValidationReview = await testDb.pool.query(
      `SELECT d.properties
       FROM documents d
       JOIN document_associations da
         ON da.document_id = d.id
        AND da.related_id = $1
        AND da.relationship_type = 'sprint'
       WHERE d.workspace_id = $2
         AND d.document_type = 'weekly_review'`,
      [first.validationWeekId, workspaceId]
    )
    expect(workerFinding.rows).toHaveLength(0)
    expect(rerunValidationReview.rows).toEqual([
      {
        properties: {
          owner_id: userId,
          plan_validated: null,
          sprint_id: first.validationWeekId,
        },
      },
    ])
  })
})
