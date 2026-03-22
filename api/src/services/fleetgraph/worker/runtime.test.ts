import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { FleetGraphState } from '../graph/types.js'
import { resolveFleetGraphWorkerSettings } from './config.js'
import { createFleetGraphWorkerRuntime } from './runtime.js'
import { createFleetGraphWorkerStore } from './store.js'
import { createWorkerTestDatabase } from './test-helpers.js'

function makeState(
  overrides: Partial<FleetGraphState> = {}
): FleetGraphState {
  return {
    approvalRequired: false,
    branch: 'quiet',
    candidateCount: 0,
    checkpointNamespace: 'fleetgraph',
    contextKind: 'proactive',
    documentId: overrides.documentId,
    hasError: false,
    mode: 'proactive',
    outcome: 'quiet',
    path: [
      'resolve_trigger_context',
      'determine_branch',
      'quiet_exit',
    ],
    routeSurface: 'workspace-sweep',
    scenarioResults: [],
    threadId: 'fleetgraph:workspace-123:scheduled-sweep',
    trigger: 'scheduled-sweep',
    workspaceId: 'workspace-123',
    ...overrides,
  }
}

function createRuntimeSequence(responses: Array<Error | FleetGraphState>) {
  let index = 0
  const checkpoints = new Map<string, FleetGraphState>()
  const finalState = responses.find(
    (response): response is FleetGraphState => !(response instanceof Error)
  )

  return {
    getState: vi.fn(async (threadId: string) => {
      const state = checkpoints.get(threadId)
      return state ? { values: state } : null
    }),
    invoke: vi.fn(async (input: { threadId: string }) => {
      const response = responses[index] ?? responses.at(-1) ?? finalState
      index += 1
      if (!response) {
        throw new Error('Runtime test sequence exhausted without a state')
      }
      if (response instanceof Error) {
        throw response
      }
      checkpoints.set(input.threadId, response)
      return response
    }),
  }
}

describe('FleetGraph worker runtime', () => {
  let testDb: Awaited<ReturnType<typeof createWorkerTestDatabase>>

  beforeAll(async () => {
    testDb = await createWorkerTestDatabase()
  }, 120_000)

  beforeEach(async () => {
    await testDb.pool.query(`TRUNCATE TABLE
      fleetgraph_sweep_schedules, fleetgraph_dedupe_ledger, fleetgraph_queue_jobs
      CASCADE`)
  })

  afterAll(async () => {
    await testDb?.close()
  })

  it('dedupes repeated dirty-context enqueue requests', async () => {
    const fixedNow = new Date('2026-03-16T12:00:00.000Z')
    const settings = resolveFleetGraphWorkerSettings()
    const store = createFleetGraphWorkerStore(testDb.pool)
    const runtime = createFleetGraphWorkerRuntime({
      now: () => fixedNow,
      runtime: createRuntimeSequence([makeState()]),
      settings,
      store,
    })

    const first = await runtime.enqueueDocumentMutation({
      documentId: 'doc-123',
      documentType: 'issue',
      workspaceId: 'workspace-123',
    })
    const second = await runtime.enqueueDocumentMutation({
      documentId: 'doc-123',
      documentType: 'issue',
      workspaceId: 'workspace-123',
    })

    expect(first.status).toBe('enqueued')
    expect(second.status).toBe('deduped')

    const jobs = await store.listQueueJobs()
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      dedupeKey: first.job?.dedupeKey,
      documentId: 'doc-123',
      status: 'queued',
      trigger: 'event',
      workspaceId: 'workspace-123',
    })

    const ledger = await store.getLedger(first.job!.dedupeKey)
    expect(ledger).toMatchObject({
      dedupeKey: first.job!.dedupeKey,
      threadId: first.job!.threadId,
      workspaceId: 'workspace-123',
    })
  })

  it('respects sweep cadence, dedupe, retry, and checkpoint updates', async () => {
    const baseNow = new Date('2026-03-16T12:00:00.000Z')
    const settings = {
      ...resolveFleetGraphWorkerSettings(),
      eventDebounceMs: 90_000,
      retryDelayMs: 60_000,
      sweepBatchSize: 10,
      sweepIntervalMs: 240_000,
    }
    const store = createFleetGraphWorkerStore(testDb.pool)
    const tracedState = makeState()
    const runtime = createFleetGraphWorkerRuntime({
      runtime: createRuntimeSequence([
        new Error('temporary upstream failure'),
        tracedState,
      ]),
      settings,
      store,
    })

    await runtime.registerWorkspaceSweep('workspace-123', baseNow)

    const firstSweep = await runtime.runDueSweeps(baseNow)
    expect(firstSweep).toEqual({
      blocked: 0,
      claimed: 1,
      deduped: 0,
      enqueued: 1,
    })

    const firstRun = await runtime.runNext(baseNow)
    expect(firstRun.status).toBe('requeued')
    expect(firstRun.job).toMatchObject({
      attemptCount: 1,
      lastError: 'temporary upstream failure',
      status: 'queued',
    })

    const tooEarly = await runtime.runNext(
      new Date(baseNow.getTime() + 30_000)
    )
    expect(tooEarly.status).toBe('idle')

    const retryRun = await runtime.runNext(
      new Date(baseNow.getTime() + 60_000)
    )
    expect(retryRun.status).toBe('completed')
    expect(retryRun.state).toMatchObject({
      branch: 'quiet',
      outcome: 'quiet',
    })

    const blockedSweep = await runtime.runDueSweeps(
      new Date(baseNow.getTime() + 240_000)
    )
    expect(blockedSweep).toEqual({
      blocked: 1,
      claimed: 1,
      deduped: 0,
      enqueued: 0,
    })

    const resumedSweep = await runtime.runDueSweeps(
      new Date(baseNow.getTime() + 300_000)
    )
    expect(resumedSweep).toEqual({
      blocked: 0,
      claimed: 1,
      deduped: 0,
      enqueued: 1,
    })

    const jobs = await store.listQueueJobs()
    expect(jobs).toHaveLength(2)
    const firstJob = jobs[0]!

    const ledger = await store.getLedger(firstJob.dedupeKey)
    expect(ledger).toMatchObject({
      checkpointBranch: 'quiet',
      checkpointOutcome: 'quiet',
      checkpointPath: [
        'resolve_trigger_context',
        'determine_branch',
        'quiet_exit',
      ],
      lastOutcome: 'quiet',
      workspaceId: 'workspace-123',
    })
  })
})
