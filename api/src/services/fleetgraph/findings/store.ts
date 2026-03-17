import type { Pool } from 'pg'

import { pool as defaultPool } from '../../../db/client.js'
import type {
  FleetGraphFindingRecord,
  FleetGraphFindingStore,
  FleetGraphUpsertFindingInput,
} from './types.js'

type Queryable = Pick<Pool, 'query'>

function parseDate(value: unknown) {
  return value ? new Date(String(value)) : undefined
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message)
  }
  return row
}

function mapFinding(row: Record<string, unknown>): FleetGraphFindingRecord {
  return {
    cooldownUntil: parseDate(row.cooldown_until),
    dedupeKey: String(row.dedupe_key),
    documentId: String(row.document_id),
    documentType: String(row.document_type),
    evidence: Array.isArray(row.evidence)
      ? row.evidence.filter((value): value is string => typeof value === 'string')
      : [],
    findingKey: String(row.finding_key),
    findingType: String(row.finding_type) as FleetGraphFindingRecord['findingType'],
    id: String(row.id),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    recommendedAction: row.recommended_action
      ? (row.recommended_action as FleetGraphFindingRecord['recommendedAction'])
      : undefined,
    snoozedUntil: parseDate(row.snoozed_until),
    status: String(row.status) as FleetGraphFindingRecord['status'],
    summary: String(row.summary),
    threadId: String(row.thread_id),
    title: String(row.title),
    tracePublicUrl: row.trace_public_url ? String(row.trace_public_url) : undefined,
    traceRunId: row.trace_run_id ? String(row.trace_run_id) : undefined,
    updatedAt: new Date(String(row.updated_at)),
    workspaceId: String(row.workspace_id),
  }
}

export function createFleetGraphFindingStore(
  queryable: Queryable = defaultPool
): FleetGraphFindingStore {
  return {
    async dismissFinding(id, workspaceId, now = new Date()) {
      const result = await queryable.query(
        `UPDATE fleetgraph_proactive_findings
         SET status = 'dismissed',
             snoozed_until = NULL,
             updated_at = $3
         WHERE id = $1 AND workspace_id = $2
         RETURNING *`,
        [id, workspaceId, now]
      ) as { rows: Record<string, unknown>[] }

      return result.rows[0] ? mapFinding(result.rows[0]) : null
    },

    async getFindingById(id, workspaceId) {
      const result = await queryable.query(
        `SELECT * FROM fleetgraph_proactive_findings
         WHERE id = $1 AND workspace_id = $2`,
        [id, workspaceId]
      ) as { rows: Record<string, unknown>[] }

      return result.rows[0] ? mapFinding(result.rows[0]) : null
    },

    async getFindingByKey(findingKey) {
      const result = await queryable.query(
        `SELECT * FROM fleetgraph_proactive_findings
         WHERE finding_key = $1`,
        [findingKey]
      ) as { rows: Record<string, unknown>[] }

      return result.rows[0] ? mapFinding(result.rows[0]) : null
    },

    async listActiveFindings({ documentIds, workspaceId }) {
      const normalizedDocumentIds = documentIds?.filter(Boolean) ?? []
      const result = await queryable.query(
        `SELECT * FROM fleetgraph_proactive_findings
         WHERE workspace_id = $1
           AND status = 'active'
           AND (
             cardinality($2::text[]) = 0
             OR document_id = ANY($2::text[])
           )
         ORDER BY updated_at DESC`,
        [workspaceId, normalizedDocumentIds]
      ) as { rows: Record<string, unknown>[] }

      return result.rows.map(mapFinding)
    },

    async resolveFinding(findingKey, now = new Date()) {
      const result = await queryable.query(
        `UPDATE fleetgraph_proactive_findings
         SET status = 'resolved',
             snoozed_until = NULL,
             updated_at = $2
         WHERE finding_key = $1
         RETURNING *`,
        [findingKey, now]
      ) as { rows: Record<string, unknown>[] }

      return result.rows[0] ? mapFinding(result.rows[0]) : null
    },

    async snoozeFinding(id, workspaceId, snoozedUntil, now = new Date()) {
      const result = await queryable.query(
        `UPDATE fleetgraph_proactive_findings
         SET status = 'snoozed',
             snoozed_until = $3,
             updated_at = $4
         WHERE id = $1 AND workspace_id = $2
         RETURNING *`,
        [id, workspaceId, snoozedUntil, now]
      ) as { rows: Record<string, unknown>[] }

      return result.rows[0] ? mapFinding(result.rows[0]) : null
    },

    async upsertFinding(input: FleetGraphUpsertFindingInput, now = new Date()) {
      const result = await queryable.query(
        `INSERT INTO fleetgraph_proactive_findings (
           workspace_id, finding_key, dedupe_key, thread_id, finding_type,
           document_id, document_type, title, summary, evidence,
           recommended_action, trace_run_id, trace_public_url,
           cooldown_until, metadata, updated_at
         )
         VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10::jsonb,
           $11::jsonb, $12, $13,
           $14, $15::jsonb, $16
         )
         ON CONFLICT (finding_key) DO UPDATE
         SET title = EXCLUDED.title,
             summary = EXCLUDED.summary,
             evidence = EXCLUDED.evidence,
             recommended_action = EXCLUDED.recommended_action,
             trace_run_id = EXCLUDED.trace_run_id,
             trace_public_url = EXCLUDED.trace_public_url,
             cooldown_until = EXCLUDED.cooldown_until,
             metadata = EXCLUDED.metadata,
             updated_at = EXCLUDED.updated_at,
             status = CASE
               WHEN fleetgraph_proactive_findings.status = 'dismissed' THEN 'dismissed'
               WHEN fleetgraph_proactive_findings.status = 'snoozed'
                    AND fleetgraph_proactive_findings.snoozed_until IS NOT NULL
                    AND fleetgraph_proactive_findings.snoozed_until > EXCLUDED.updated_at
                 THEN 'snoozed'
               ELSE 'active'
             END,
             snoozed_until = CASE
               WHEN fleetgraph_proactive_findings.status = 'snoozed'
                    AND fleetgraph_proactive_findings.snoozed_until IS NOT NULL
                    AND fleetgraph_proactive_findings.snoozed_until > EXCLUDED.updated_at
                 THEN fleetgraph_proactive_findings.snoozed_until
               ELSE NULL
             END
         RETURNING *`,
        [
          input.workspaceId,
          input.findingKey,
          input.dedupeKey,
          input.threadId,
          input.findingType,
          input.documentId,
          input.documentType,
          input.title,
          input.summary,
          JSON.stringify(input.evidence),
          input.recommendedAction ? JSON.stringify(input.recommendedAction) : null,
          input.traceRunId ?? null,
          input.tracePublicUrl ?? null,
          input.cooldownUntil ?? null,
          JSON.stringify(input.metadata ?? {}),
          now,
        ]
      ) as { rows: Record<string, unknown>[] }

      return mapFinding(
        requireRow(
          result.rows[0],
          `Failed to upsert proactive finding ${input.findingKey}`
        )
      )
    },
  }
}
