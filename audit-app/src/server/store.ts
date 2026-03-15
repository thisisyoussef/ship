import { pool } from './db.js';

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

export async function createRun(input: CreateRunInput) {
  const result = await pool.query(
    `INSERT INTO audit_runs (mode, category, baseline_repo, baseline_ref, submission_repo, submission_ref)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.mode, input.category, input.baselineRepo, input.baselineRef, input.submissionRepo, input.submissionRef]
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
       SET status = 'running', started_at = NOW()
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
     SET status = 'failed', finished_at = NOW(), error = $2
     WHERE id = $1`,
    [runId, errorMessage]
  );
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
    artifactNames: Array.isArray(row.artifact_names) ? row.artifact_names.map(String) : [],
  };
}
