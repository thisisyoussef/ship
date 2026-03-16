import type { Pool } from 'pg'

import { pool as defaultPool } from '../../../db/client.js'
import type { FleetGraphState } from '../graph/types.js'
import type {
  FleetGraphDedupeLedger,
  FleetGraphEnqueueInput,
  FleetGraphEnqueueResult,
  FleetGraphQueueJob,
  FleetGraphSweepSchedule,
  FleetGraphWorkerStore,
} from './types.js'

type Queryable = Pick<Pool, 'query' | 'connect'>

function parseDate(value: unknown) {
  return value instanceof Date ? value : new Date(String(value))
}

function parseCheckpointPath(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message)
  }

  return row
}

function mapJob(row: Record<string, unknown>): FleetGraphQueueJob {
  return {
    actorId: row.actor_id ? String(row.actor_id) : undefined,
    attemptCount: Number(row.attempt_count),
    availableAt: parseDate(row.available_at),
    createdAt: parseDate(row.created_at),
    dedupeKey: String(row.dedupe_key),
    documentId: row.document_id ? String(row.document_id) : undefined,
    documentType: row.document_type ? String(row.document_type) : undefined,
    finishedAt: row.finished_at ? parseDate(row.finished_at) : undefined,
    id: String(row.id),
    lastError: row.last_error ? String(row.last_error) : undefined,
    maxAttempts: Number(row.max_attempts),
    mode: String(row.mode) as FleetGraphQueueJob['mode'],
    payload: (row.payload as Record<string, unknown>) ?? {},
    routeSurface: row.route_surface ? String(row.route_surface) : undefined,
    startedAt: row.started_at ? parseDate(row.started_at) : undefined,
    status: String(row.status) as FleetGraphQueueJob['status'],
    threadId: String(row.thread_id),
    trigger: String(row.trigger) as FleetGraphQueueJob['trigger'],
    updatedAt: parseDate(row.updated_at),
    workspaceId: String(row.workspace_id),
  }
}

function mapLedger(row: Record<string, unknown>): FleetGraphDedupeLedger {
  return {
    checkpointBranch: row.checkpoint_branch
      ? String(row.checkpoint_branch)
      : undefined,
    checkpointOutcome: row.checkpoint_outcome
      ? String(row.checkpoint_outcome)
      : undefined,
    checkpointPath: parseCheckpointPath(row.checkpoint_path),
    createdAt: parseDate(row.created_at),
    dedupeKey: String(row.dedupe_key),
    lastCompletedAt: row.last_completed_at
      ? parseDate(row.last_completed_at)
      : undefined,
    lastEnqueuedAt: row.last_enqueued_at
      ? parseDate(row.last_enqueued_at)
      : undefined,
    lastError: row.last_error ? String(row.last_error) : undefined,
    lastJobId: row.last_job_id ? String(row.last_job_id) : undefined,
    lastOutcome: row.last_outcome ? String(row.last_outcome) as FleetGraphDedupeLedger['lastOutcome'] : undefined,
    lastStartedAt: row.last_started_at
      ? parseDate(row.last_started_at)
      : undefined,
    nextEligibleAt: row.next_eligible_at
      ? parseDate(row.next_eligible_at)
      : undefined,
    threadId: String(row.thread_id),
    updatedAt: parseDate(row.updated_at),
    workspaceId: String(row.workspace_id),
  }
}

function mapSweep(row: Record<string, unknown>): FleetGraphSweepSchedule {
  return {
    createdAt: parseDate(row.created_at),
    enabled: Boolean(row.enabled),
    lastSweptAt: row.last_swept_at ? parseDate(row.last_swept_at) : undefined,
    nextSweepAt: parseDate(row.next_sweep_at),
    updatedAt: parseDate(row.updated_at),
    workspaceId: String(row.workspace_id),
  }
}

function checkpointSummary(checkpoint: unknown, fallbackState?: FleetGraphState) {
  const values = checkpoint && typeof checkpoint === 'object'
    ? (checkpoint as { values?: Record<string, unknown> }).values
    : undefined

  return {
    branch: typeof values?.branch === 'string'
      ? values.branch
      : fallbackState?.branch,
    outcome: typeof values?.outcome === 'string'
      ? values.outcome
      : fallbackState?.outcome,
    path: parseCheckpointPath(values?.path ?? fallbackState?.path),
  }
}

export function createFleetGraphWorkerStore(
  queryable: Queryable = defaultPool
): FleetGraphWorkerStore {
  return {
    async enqueue(input: FleetGraphEnqueueInput, now: Date, maxAttempts: number): Promise<FleetGraphEnqueueResult> {
      const client = await queryable.connect()
      try {
        await client.query('BEGIN')
        await client.query(
          `INSERT INTO fleetgraph_dedupe_ledger (dedupe_key, workspace_id, thread_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (dedupe_key) DO NOTHING`,
          [input.dedupeKey, input.workspaceId, input.threadId]
        )

        const ledgerResult = await client.query(
          `SELECT * FROM fleetgraph_dedupe_ledger
           WHERE dedupe_key = $1
           FOR UPDATE`,
          [input.dedupeKey]
        ) as { rows: Record<string, unknown>[] }
        const ledger = mapLedger(
          requireRow(
            ledgerResult.rows[0],
            `Missing dedupe ledger for ${input.dedupeKey}`
          )
        )

        const activeResult = await client.query(
          `SELECT * FROM fleetgraph_queue_jobs
           WHERE dedupe_key = $1
             AND status IN ('queued', 'running')
           ORDER BY created_at DESC
           LIMIT 1`,
          [input.dedupeKey]
        ) as { rows: Record<string, unknown>[] }

        if (activeResult.rows[0]) {
          await client.query('COMMIT')
          return {
            job: mapJob(activeResult.rows[0]),
            ledger,
            status: 'deduped',
          }
        }

        if (ledger.nextEligibleAt && ledger.nextEligibleAt > now) {
          await client.query('COMMIT')
          return { job: null, ledger, status: 'blocked' }
        }

        const availableAt = input.availableAt ?? now
        const jobResult = await client.query(
          `INSERT INTO fleetgraph_queue_jobs (
             workspace_id, mode, trigger, dedupe_key, thread_id, document_id,
             document_type, actor_id, route_surface, available_at, max_attempts
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            input.workspaceId,
            input.mode,
            input.trigger,
            input.dedupeKey,
            input.threadId,
            input.documentId ?? null,
            input.documentType ?? null,
            input.actorId ?? null,
            input.routeSurface ?? null,
            availableAt,
            maxAttempts,
          ]
        ) as { rows: Record<string, unknown>[] }
        const createdJob = requireRow(
          jobResult.rows[0],
          `Failed to create queue job for ${input.dedupeKey}`
        )

        const updatedLedgerResult = await client.query(
          `UPDATE fleetgraph_dedupe_ledger
           SET last_job_id = $2,
               last_enqueued_at = $3,
               last_error = NULL,
               updated_at = $3
           WHERE dedupe_key = $1
          RETURNING *`,
          [input.dedupeKey, createdJob.id, now]
        ) as { rows: Record<string, unknown>[] }

        await client.query('COMMIT')
        return {
          job: mapJob(createdJob),
          ledger: mapLedger(
            requireRow(
              updatedLedgerResult.rows[0],
              `Failed to update dedupe ledger for ${input.dedupeKey}`
            )
          ),
          status: 'enqueued',
        }
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },

    async registerWorkspaceSweep(workspaceId: string, nextSweepAt: Date) {
      const result = await queryable.query(
        `INSERT INTO fleetgraph_sweep_schedules (workspace_id, next_sweep_at)
         VALUES ($1, $2)
         ON CONFLICT (workspace_id) DO UPDATE
         SET enabled = TRUE,
             next_sweep_at = EXCLUDED.next_sweep_at,
             updated_at = NOW()
         RETURNING *`,
        [workspaceId, nextSweepAt]
      ) as { rows: Record<string, unknown>[] }
      return mapSweep(
        requireRow(
          result.rows[0],
          `Failed to register sweep for ${workspaceId}`
        )
      )
    },

    async claimDueSweepSchedules(now: Date, limit: number, sweepIntervalMs: number) {
      const nextSweepAt = new Date(now.getTime() + sweepIntervalMs)
      const result = await queryable.query(
        `WITH due AS (
           SELECT workspace_id
           FROM fleetgraph_sweep_schedules
           WHERE enabled = TRUE
             AND next_sweep_at <= $1
           ORDER BY next_sweep_at ASC
           LIMIT $2
           FOR UPDATE SKIP LOCKED
         )
         UPDATE fleetgraph_sweep_schedules AS schedules
         SET last_swept_at = $1,
             next_sweep_at = $3,
             updated_at = $1
         FROM due
         WHERE schedules.workspace_id = due.workspace_id
         RETURNING schedules.*`,
        [now, limit, nextSweepAt]
	      ) as { rows: Record<string, unknown>[] }
      return result.rows.map(mapSweep)
    },

    async claimNextJob(now: Date) {
      const client = await queryable.connect()
      try {
        await client.query('BEGIN')
        const result = await client.query(
          `WITH candidate AS (
             SELECT id
             FROM fleetgraph_queue_jobs
             WHERE status = 'queued'
               AND available_at <= $1
             ORDER BY available_at ASC, created_at ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED
           )
           UPDATE fleetgraph_queue_jobs AS jobs
           SET status = 'running',
               started_at = $1,
               attempt_count = attempt_count + 1,
               updated_at = $1
           FROM candidate
           WHERE jobs.id = candidate.id
           RETURNING jobs.*`,
          [now]
        ) as { rows: Record<string, unknown>[] }

        if (!result.rows[0]) {
          await client.query('COMMIT')
          return null
        }

        await client.query(
          `UPDATE fleetgraph_dedupe_ledger
           SET last_started_at = $2,
               updated_at = $2
           WHERE dedupe_key = $1`,
          [
            requireRow(
              result.rows[0],
              'Claimed queue job missing during ledger update'
            ).dedupe_key,
            now,
          ]
        )
        await client.query('COMMIT')
        return mapJob(
          requireRow(result.rows[0], 'Claimed queue job missing after update')
        )
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },

    async completeJob(jobId, state, checkpoint, now, cooldownMs) {
      const summary = checkpointSummary(checkpoint, state)
      const nextEligibleAt = new Date(now.getTime() + cooldownMs)
      const result = await queryable.query(
        `WITH finished AS (
           UPDATE fleetgraph_queue_jobs
           SET status = 'completed',
               finished_at = $2,
               last_error = NULL,
               updated_at = $2
           WHERE id = $1
           RETURNING *
         )
         UPDATE fleetgraph_dedupe_ledger AS ledger
         SET last_completed_at = $2,
             last_error = NULL,
             last_outcome = $3,
             checkpoint_branch = $4,
             checkpoint_outcome = $5,
             checkpoint_path = $6::jsonb,
             next_eligible_at = $7,
             updated_at = $2
         FROM finished
         WHERE ledger.dedupe_key = finished.dedupe_key
         RETURNING finished.*`,
        [jobId, now, state.outcome, summary.branch ?? null, summary.outcome ?? null, JSON.stringify(summary.path), nextEligibleAt]
      ) as { rows: Record<string, unknown>[] }
      return mapJob(
        requireRow(result.rows[0], `Missing completed queue job ${jobId}`)
      )
    },

    async failJob(jobId, errorMessage, checkpoint, now, retryDelayMs) {
      const client = await queryable.connect()
      try {
        await client.query('BEGIN')
        const jobResult = await client.query(
          `SELECT * FROM fleetgraph_queue_jobs
           WHERE id = $1
           FOR UPDATE`,
          [jobId]
        ) as { rows: Record<string, unknown>[] }
        const job = mapJob(
          requireRow(jobResult.rows[0], `Missing queue job ${jobId}`)
        )
        const retryAt = new Date(now.getTime() + retryDelayMs)
        const shouldRetry = job.attemptCount < job.maxAttempts
        const summary = checkpointSummary(checkpoint)

        const updatedJobResult = await client.query(
          `UPDATE fleetgraph_queue_jobs
           SET status = $2,
               available_at = $3,
               finished_at = $4,
               last_error = $5,
               updated_at = $6
           WHERE id = $1
           RETURNING *`,
          [jobId, shouldRetry ? 'queued' : 'failed', retryAt, shouldRetry ? null : now, errorMessage, now]
        ) as { rows: Record<string, unknown>[] }

        await client.query(
          `UPDATE fleetgraph_dedupe_ledger
           SET last_completed_at = CASE WHEN $3 THEN last_completed_at ELSE $2 END,
               last_error = $4,
               last_outcome = CASE WHEN $3 THEN last_outcome ELSE 'failed' END,
               checkpoint_branch = COALESCE($5, checkpoint_branch),
               checkpoint_outcome = COALESCE($6, checkpoint_outcome),
               checkpoint_path = $7::jsonb,
               next_eligible_at = $8,
               updated_at = $2
           WHERE dedupe_key = $1`,
          [job.dedupeKey, now, shouldRetry, errorMessage, summary.branch ?? null, summary.outcome ?? null, JSON.stringify(summary.path), retryAt]
        )

        await client.query('COMMIT')
        return mapJob(
          requireRow(updatedJobResult.rows[0], `Missing updated queue job ${jobId}`)
        )
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },

    async getQueueJob(jobId: string) {
      const result = await queryable.query(
        'SELECT * FROM fleetgraph_queue_jobs WHERE id = $1',
        [jobId]
      ) as { rows: Record<string, unknown>[] }
      return result.rows[0] ? mapJob(result.rows[0]) : null
    },

    async getLedger(dedupeKey: string) {
      const result = await queryable.query(
        'SELECT * FROM fleetgraph_dedupe_ledger WHERE dedupe_key = $1',
        [dedupeKey]
      ) as { rows: Record<string, unknown>[] }
      return result.rows[0] ? mapLedger(result.rows[0]) : null
    },

    async listQueueJobs() {
      const result = await queryable.query(
        'SELECT * FROM fleetgraph_queue_jobs ORDER BY created_at ASC'
      ) as { rows: Record<string, unknown>[] }
      return result.rows.map(mapJob)
    },
  }
}
