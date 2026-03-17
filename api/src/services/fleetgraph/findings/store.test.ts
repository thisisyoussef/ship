import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

import { createWorkerTestDatabase } from '../worker/test-helpers.js'
import { createFleetGraphFindingStore } from './store.js'

describe('FleetGraph finding store', () => {
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

  it('persists active findings with trace metadata', async () => {
    const store = createFleetGraphFindingStore(testDb.pool)
    const finding = await store.upsertFinding({
      cooldownUntil: new Date('2026-03-17T16:05:00.000Z'),
      dedupeKey: 'dedupe:workspace-1:sprint-1',
      documentId: 'sprint-1',
      documentType: 'sprint',
      evidence: ['Week is still planning after the expected start threshold.'],
      findingKey: 'week-start-drift:workspace-1:sprint-1',
      findingType: 'week_start_drift',
      metadata: { issueCount: 0 },
      summary: 'Sprint 1 still needs to be started.',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-1',
      title: 'Week start drift detected',
      tracePublicUrl: 'https://smith.langchain.com/public/example/r',
      traceRunId: 'run-123',
      workspaceId: 'workspace-1',
    })

    expect(finding).toMatchObject({
      dedupeKey: 'dedupe:workspace-1:sprint-1',
      documentId: 'sprint-1',
      status: 'active',
      traceRunId: 'run-123',
      workspaceId: 'workspace-1',
    })

    const listed = await store.listActiveFindings({ workspaceId: 'workspace-1' })
    expect(listed).toHaveLength(1)
    expect(listed[0]?.findingKey).toBe('week-start-drift:workspace-1:sprint-1')
  })

  it('filters active findings to the requested related document ids', async () => {
    const store = createFleetGraphFindingStore(testDb.pool)

    await store.upsertFinding({
      dedupeKey: 'dedupe:workspace-1:sprint-1',
      documentId: 'sprint-1',
      documentType: 'sprint',
      evidence: ['Sprint 1 drift'],
      findingKey: 'week-start-drift:workspace-1:sprint-1',
      findingType: 'week_start_drift',
      summary: 'Sprint 1 needs attention.',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-1',
      title: 'Week start drift detected',
      workspaceId: 'workspace-1',
    })
    await store.upsertFinding({
      dedupeKey: 'dedupe:workspace-1:sprint-2',
      documentId: 'sprint-2',
      documentType: 'sprint',
      evidence: ['Sprint 2 drift'],
      findingKey: 'week-start-drift:workspace-1:sprint-2',
      findingType: 'week_start_drift',
      summary: 'Sprint 2 needs attention.',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-2',
      title: 'Week start drift detected',
      workspaceId: 'workspace-1',
    })

    const listed = await store.listActiveFindings({
      documentIds: ['sprint-2'],
      workspaceId: 'workspace-1',
    })

    expect(listed).toHaveLength(1)
    expect(listed[0]?.documentId).toBe('sprint-2')
  })

  it('keeps dismissed findings suppressed on later upserts', async () => {
    const store = createFleetGraphFindingStore(testDb.pool)
    const created = await store.upsertFinding({
      dedupeKey: 'dedupe:workspace-1:sprint-1',
      documentId: 'sprint-1',
      documentType: 'sprint',
      evidence: ['Initial evidence'],
      findingKey: 'week-start-drift:workspace-1:sprint-1',
      findingType: 'week_start_drift',
      summary: 'Initial summary',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-1',
      title: 'Week start drift detected',
      workspaceId: 'workspace-1',
    })

    const dismissed = await store.dismissFinding(
      created.id,
      'workspace-1',
      new Date('2026-03-17T16:00:00.000Z')
    )

    expect(dismissed?.status).toBe('dismissed')

    const updated = await store.upsertFinding({
      dedupeKey: 'dedupe:workspace-1:sprint-1',
      documentId: 'sprint-1',
      documentType: 'sprint',
      evidence: ['New evidence that should not reopen the finding automatically'],
      findingKey: 'week-start-drift:workspace-1:sprint-1',
      findingType: 'week_start_drift',
      summary: 'Updated summary',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-1',
      title: 'Week start drift detected',
      workspaceId: 'workspace-1',
    }, new Date('2026-03-17T16:10:00.000Z'))

    expect(updated.status).toBe('dismissed')
    expect(await store.listActiveFindings({ workspaceId: 'workspace-1' }))
      .toHaveLength(0)
  })

  it('reactivates expired snoozed findings when they are listed after expiry', async () => {
    const store = createFleetGraphFindingStore(testDb.pool)
    const created = await store.upsertFinding({
      dedupeKey: 'dedupe:workspace-1:sprint-1',
      documentId: 'sprint-1',
      documentType: 'sprint',
      evidence: ['Initial evidence'],
      findingKey: 'week-start-drift:workspace-1:sprint-1',
      findingType: 'week_start_drift',
      summary: 'Initial summary',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-1',
      title: 'Week start drift detected',
      workspaceId: 'workspace-1',
    })

    const snoozed = await store.snoozeFinding(
      created.id,
      'workspace-1',
      new Date('2026-03-17T20:00:00.000Z'),
      new Date('2026-03-17T16:00:00.000Z')
    )
    expect(snoozed?.status).toBe('snoozed')

    const midSnooze = await store.upsertFinding({
      dedupeKey: 'dedupe:workspace-1:sprint-1',
      documentId: 'sprint-1',
      documentType: 'sprint',
      evidence: ['Evidence while still snoozed'],
      findingKey: 'week-start-drift:workspace-1:sprint-1',
      findingType: 'week_start_drift',
      summary: 'Still snoozed',
      threadId: 'fleetgraph:workspace-1:scheduled-sweep:sprint-1',
      title: 'Week start drift detected',
      workspaceId: 'workspace-1',
    }, new Date('2026-03-17T18:00:00.000Z'))

    expect(midSnooze.status).toBe('snoozed')
    expect(
      await store.listActiveFindings(
        { workspaceId: 'workspace-1' },
        new Date('2026-03-17T18:00:00.000Z')
      )
    )
      .toHaveLength(0)

    const listedAfterExpiry = await store.listActiveFindings(
      { workspaceId: 'workspace-1' },
      new Date('2026-03-17T21:00:00.000Z')
    )

    expect(listedAfterExpiry).toHaveLength(1)
    expect(listedAfterExpiry[0]?.status).toBe('active')
    expect(listedAfterExpiry[0]?.snoozedUntil).toBeUndefined()
  })
})
