import { pool } from './db.js';
import { createInitialProgress, type ProgressSnapshot } from './progress.js';

type CreateRunInput = {
  mode: 'full' | 'category';
  category: string | null;
  baselineRepo: string;
  baselineRef: string;
  submissionRepo: string;
  submissionRef: string;
};

type RunArtifacts = Array<{
  name: string;
  contentType: string;
  body: Buffer;
}>;

type RunEventRowInput = {
  type: string;
  level?: string;
  phase?: string | null;
  targetLabel?: string | null;
  categoryId?: string | null;
  commandId?: string | null;
  stream?: string | null;
  message: string;
  payload?: unknown;
  createdAt?: string;
};

export async function createRun(input: CreateRunInput) {
  const progress = createInitialProgress(input.mode, input.category);
  const result = await pool.query(
    `INSERT INTO audit_runs (mode, category, baseline_repo, baseline_ref, submission_repo, submission_ref, progress_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [
      input.mode,
      input.category,
      input.baselineRepo,
      input.baselineRef,
      input.submissionRepo,
      input.submissionRef,
      JSON.stringify(progress),
    ]
  );
  return mapRun(result.rows[0]);
}

export async function listRuns(limit = 12) {
  const result = await pool.query(
    `SELECT r.*, COALESCE(array_agg(a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS artifact_names
     FROM audit_runs r
     LEFT JOIN audit_artifacts a ON a.run_id = r.id
     GROUP BY r.id
     ORDER BY r.requested_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(mapRun);
}

export async function getRun(id: string) {
  const result = await pool.query(
    `SELECT r.*, COALESCE(array_agg(a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS artifact_names
     FROM audit_runs r
     LEFT JOIN audit_artifacts a ON a.run_id = r.id
     WHERE r.id = $1
     GROUP BY r.id`,
    [id]
  );
  return result.rows[0] ? mapRun(result.rows[0]) : null;
}

export async function getArtifact(runId: string, name: string) {
  const result = await pool.query(
    `SELECT name, content_type, body FROM audit_artifacts WHERE run_id = $1 AND name = $2`,
    [runId, name]
  );
  return result.rows[0] ?? null;
}

export async function claimNextRun() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const candidate = await client.query(
      `SELECT * FROM audit_runs
       WHERE status = 'queued'
       ORDER BY requested_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );

    if (!candidate.rows[0]) {
      await client.query('COMMIT');
      return null;
    }

    const claimed = await client.query(
      `UPDATE audit_runs
       SET status = 'running', started_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [candidate.rows[0].id]
    );
    await client.query('COMMIT');
    return mapRun(claimed.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function finishRun({
  runId,
  baselineSha,
  submissionSha,
  summaryJson,
  comparisonJson,
  artifacts,
}: {
  runId: string;
  baselineSha: string;
  submissionSha: string;
  summaryJson: unknown;
  comparisonJson: unknown;
  artifacts: RunArtifacts;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE audit_runs
       SET status = 'finished',
           finished_at = NOW(),
           updated_at = NOW(),
           baseline_sha = $2,
           submission_sha = $3,
           summary_json = $4::jsonb,
           comparison_json = $5::jsonb,
           error = NULL
       WHERE id = $1`,
      [runId, baselineSha, submissionSha, JSON.stringify(summaryJson), JSON.stringify(comparisonJson)]
    );

    for (const artifact of artifacts) {
      await client.query(
        `INSERT INTO audit_artifacts (run_id, name, content_type, body)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (run_id, name)
         DO UPDATE SET content_type = EXCLUDED.content_type, body = EXCLUDED.body`,
        [runId, artifact.name, artifact.contentType, artifact.body]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function failRun(runId: string, errorMessage: string) {
  await pool.query(
    `UPDATE audit_runs
     SET status = 'failed', finished_at = NOW(), updated_at = NOW(), error = $2
     WHERE id = $1`,
    [runId, errorMessage]
  );
}

export async function updateRunProgress(runId: string, progress: ProgressSnapshot) {
  await pool.query(
    `UPDATE audit_runs
     SET progress_json = $2::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [runId, JSON.stringify(progress)]
  );
}

export async function appendRunEvents(runId: string, events: RunEventRowInput[]) {
  if (events.length === 0) {
    return;
  }

  const values: unknown[] = [];
  const rows = events
    .map((event, index) => {
      const offset = index * 10;
      values.push(
        runId,
        event.type,
        event.level ?? 'info',
        event.phase ?? null,
        event.targetLabel ?? null,
        event.categoryId ?? null,
        event.commandId ?? null,
        event.stream ?? null,
        event.message,
        event.payload ? JSON.stringify(event.payload) : null
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}::jsonb)`;
    })
    .join(', ');

  await pool.query(
    `INSERT INTO audit_run_events (
      run_id,
      event_type,
      level,
      phase,
      target_label,
      category_id,
      command_id,
      stream,
      message,
      payload
    ) VALUES ${rows}`,
    values
  );
}

export async function listRunEvents(runId: string, afterId = 0, limit = 300) {
  const result = await pool.query(
    `SELECT id,
            event_type,
            level,
            phase,
            target_label,
            category_id,
            command_id,
            stream,
            message,
            payload,
            created_at
     FROM audit_run_events
     WHERE run_id = $1
       AND id > $2
     ORDER BY id ASC
     LIMIT $3`,
    [runId, afterId, limit]
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    type: String(row.event_type),
    level: String(row.level),
    phase: row.phase ? String(row.phase) : null,
    targetLabel: row.target_label ? String(row.target_label) : null,
    categoryId: row.category_id ? String(row.category_id) : null,
    commandId: row.command_id ? String(row.command_id) : null,
    stream: row.stream ? String(row.stream) : null,
    message: String(row.message),
    payload: row.payload ?? null,
    createdAt: String(row.created_at),
  }));
}

function mapRun(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    mode: row.mode,
    category: row.category ? String(row.category) : null,
    status: String(row.status),
    error: row.error ? String(row.error) : null,
    requestedAt: String(row.requested_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    baselineRepo: String(row.baseline_repo),
    baselineRef: String(row.baseline_ref),
    baselineSha: row.baseline_sha ? String(row.baseline_sha) : null,
    submissionRepo: String(row.submission_repo),
    submissionRef: String(row.submission_ref),
    submissionSha: row.submission_sha ? String(row.submission_sha) : null,
    summaryJson: row.summary_json ?? null,
    comparisonJson: row.comparison_json ?? null,
    progressJson: row.progress_json ?? null,
    artifactNames: Array.isArray(row.artifact_names) ? row.artifact_names.map(String) : [],
  };
}
