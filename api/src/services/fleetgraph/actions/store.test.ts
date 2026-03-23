import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

import { createWorkerTestDatabase } from '../worker/test-helpers.js'
import { createFleetGraphFindingStore } from '../findings/store.js'
import { createFleetGraphFindingActionStore } from './store.js'

describe('FleetGraph finding action store', () => {
  let testDb: Awaited<ReturnType<typeof createWorkerTestDatabase>>

  beforeAll(async () => {
    testDb = await createWorkerTestDatabase()
  }, 120_000)

  beforeEach(async () => {
    await testDb.pool.query(`TRUNCATE TABLE
      fleetgraph_finding_action_runs,
      fleetgraph_proactive_findings,
      fleetgraph_sweep_schedules,
      fleetgraph_dedupe_ledger,
      fleetgraph_queue_jobs
      CASCADE`)
  })

  afterAll(async () => {
    await testDb?.close()
  })

  it('suppresses duplicate start-week executions after a successful apply', async () => {
    const findingStore = createFleetGraphFindingStore(testDb.pool)
    const actionStore = createFleetGraphFindingActionStore(testDb.pool)
    const finding = await findingStore.upsertFinding({
      dedupeKey: 'dedupe:workspace-1:sprint-1',
      documentId: '11111111-1111-4111-8111-111111111111',
      documentType: 'sprint',
      evidence: ['Week is still planning after its start date.'],
      findingKey: 'week-start-drift:workspace-1:sprint-1',
      findingType: 'week_start_drift',
      summary: 'Sprint 1 needs to be started.',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-1',
      title: 'Week start drift detected',
      workspaceId: 'workspace-1',
    })

    const first = await actionStore.beginExecution({
      actionType: 'start_week',
      endpoint: {
        method: 'POST',
        path: '/api/weeks/11111111-1111-4111-8111-111111111111/start',
      },
      findingId: finding.id,
      workspaceId: 'workspace-1',
    })

    expect(first.shouldExecute).toBe(true)

    await actionStore.finishExecution({
      actionType: 'start_week',
      endpoint: first.execution.endpoint,
      findingId: finding.id,
      message: 'Week started successfully with 2 scoped issues.',
      resultStatusCode: 200,
      status: 'applied',
      workspaceId: 'workspace-1',
    })

    const second = await actionStore.beginExecution({
      actionType: 'start_week',
      endpoint: first.execution.endpoint,
      findingId: finding.id,
      workspaceId: 'workspace-1',
    })

    expect(second.shouldExecute).toBe(false)
    expect(second.execution.status).toBe('applied')
    expect(second.execution.attemptCount).toBe(1)
  })

  it('suppresses duplicate assign-owner executions after a successful apply', async () => {
    const findingStore = createFleetGraphFindingStore(testDb.pool)
    const actionStore = createFleetGraphFindingActionStore(testDb.pool)
    const finding = await findingStore.upsertFinding({
      dedupeKey: 'dedupe:workspace-1:sprint-2',
      documentId: '22222222-2222-4222-8222-222222222222',
      documentType: 'sprint',
      evidence: ['No sprint owner is assigned right now.'],
      findingKey: 'sprint-no-owner:workspace-1:sprint-2',
      findingType: 'sprint_no_owner',
      summary: 'Sprint 2 needs a named owner.',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-2',
      title: 'Sprint owner gap detected',
      workspaceId: 'workspace-1',
    })

    const first = await actionStore.beginExecution({
      actionType: 'assign_owner',
      endpoint: {
        method: 'PATCH',
        path: '/api/documents/22222222-2222-4222-8222-222222222222',
      },
      findingId: finding.id,
      workspaceId: 'workspace-1',
    })

    expect(first.shouldExecute).toBe(true)

    await actionStore.finishExecution({
      actionType: 'assign_owner',
      endpoint: first.execution.endpoint,
      findingId: finding.id,
      message: 'Sprint owner assigned in Ship. Look for Owner showing you on this page.',
      resultStatusCode: 200,
      status: 'applied',
      workspaceId: 'workspace-1',
    })

    const second = await actionStore.beginExecution({
      actionType: 'assign_owner',
      endpoint: first.execution.endpoint,
      findingId: finding.id,
      workspaceId: 'workspace-1',
    })

    expect(second.shouldExecute).toBe(false)
    expect(second.execution.actionType).toBe('assign_owner')
    expect(second.execution.status).toBe('applied')
    expect(second.execution.attemptCount).toBe(1)
  })
})
