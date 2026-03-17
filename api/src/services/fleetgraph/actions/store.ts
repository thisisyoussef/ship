import type { Pool } from 'pg'

import { pool as defaultPool } from '../../../db/client.js'
import type {
  BeginFindingActionExecutionInput,
  BeginFindingActionExecutionResult,
  FinishFindingActionExecutionInput,
  FleetGraphFindingActionExecutionRecord,
  FleetGraphFindingActionStore,
} from './types.js'

type Queryable = Pick<Pool, 'connect' | 'query'>

function parseDate(value: unknown) {
  return value ? new Date(String(value)) : undefined
}

function mapExecution(
  row: Record<string, unknown>
): FleetGraphFindingActionExecutionRecord {
  return {
    actionType: 'start_week',
    appliedAt: parseDate(row.applied_at),
    attemptCount: Number(row.attempt_count),
    endpoint: {
      method: String(row.endpoint_method) as 'POST',
      path: String(row.endpoint_path),
    },
    findingId: String(row.finding_id),
    message: String(row.outcome_message),
    resultStatusCode: row.result_status_code
      ? Number(row.result_status_code)
      : undefined,
    status: String(row.status) as FleetGraphFindingActionExecutionRecord['status'],
    updatedAt: new Date(String(row.updated_at)),
  }
}

async function selectExecutionForUpdate(
  queryable: { query(sql: string, values?: unknown[]): Promise<unknown> },
  findingId: string,
  workspaceId: string
) {
  const result = await queryable.query(
    `SELECT * FROM fleetgraph_finding_action_runs
     WHERE finding_id = $1 AND workspace_id = $2
     FOR UPDATE`,
    [findingId, workspaceId]
  ) as { rows: Record<string, unknown>[] }

  return result.rows[0]
}

export function createFleetGraphFindingActionStore(
  queryable: Queryable = defaultPool
): FleetGraphFindingActionStore {
  return {
    async beginStartWeekExecution(input, now = new Date()) {
      const client = await queryable.connect()

      try {
        await client.query('BEGIN')
        const inserted = await client.query(
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
           VALUES ($1, $2, 'start_week', $3, $4, 'pending', $5, 1, $6)
           ON CONFLICT (finding_id, action_type) DO NOTHING
           RETURNING *`,
          [
            input.findingId,
            input.workspaceId,
            input.endpoint.method,
            input.endpoint.path,
            'Applying the FleetGraph recommendation.',
            now,
          ]
        ) as { rows: Record<string, unknown>[] }

        if (inserted.rows[0]) {
          await client.query('COMMIT')
          return {
            execution: mapExecution(inserted.rows[0]),
            shouldExecute: true,
          } satisfies BeginFindingActionExecutionResult
        }

        const existing = await selectExecutionForUpdate(
          client,
          input.findingId,
          input.workspaceId
        )

        if (!existing) {
          throw new Error(
            `Missing finding action execution row for ${input.findingId}`
          )
        }

        const existingStatus = String(existing.status)
        if (
          existingStatus === 'applied'
          || existingStatus === 'already_applied'
          || existingStatus === 'pending'
        ) {
          await client.query('COMMIT')
          return {
            execution: mapExecution(existing),
            shouldExecute: false,
          } satisfies BeginFindingActionExecutionResult
        }

        const restarted = await client.query(
          `UPDATE fleetgraph_finding_action_runs
           SET endpoint_method = $3,
               endpoint_path = $4,
               status = 'pending',
               outcome_message = $5,
               result_status_code = NULL,
               applied_at = NULL,
               attempt_count = attempt_count + 1,
               updated_at = $6
           WHERE finding_id = $1 AND workspace_id = $2
           RETURNING *`,
          [
            input.findingId,
            input.workspaceId,
            input.endpoint.method,
            input.endpoint.path,
            'Retrying the FleetGraph recommendation.',
            now,
          ]
        ) as { rows: Record<string, unknown>[] }

        await client.query('COMMIT')
        return {
          execution: mapExecution(restarted.rows[0]!),
          shouldExecute: true,
        } satisfies BeginFindingActionExecutionResult
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },

    async finishStartWeekExecution(input, now = new Date()) {
      const result = await queryable.query(
        `UPDATE fleetgraph_finding_action_runs
         SET endpoint_method = $3,
             endpoint_path = $4,
             status = $5,
             outcome_message = $6,
             result_status_code = $7,
             applied_at = $8,
             updated_at = $9
         WHERE finding_id = $1 AND workspace_id = $2
         RETURNING *`,
        [
          input.findingId,
          input.workspaceId,
          input.endpoint.method,
          input.endpoint.path,
          input.status,
          input.message,
          input.resultStatusCode ?? null,
          input.appliedAt ?? null,
          now,
        ]
      ) as { rows: Record<string, unknown>[] }

      if (!result.rows[0]) {
        throw new Error(
          `Failed to finish FleetGraph action execution for ${input.findingId}`
        )
      }

      return mapExecution(result.rows[0])
    },

    async listExecutionsForFindings(workspaceId, findingIds) {
      if (findingIds.length === 0) {
        return []
      }

      const result = await queryable.query(
        `SELECT * FROM fleetgraph_finding_action_runs
         WHERE workspace_id = $1
           AND finding_id = ANY($2::uuid[])`,
        [workspaceId, findingIds]
      ) as { rows: Record<string, unknown>[] }

      return result.rows.map(mapExecution)
    },
  }
}
