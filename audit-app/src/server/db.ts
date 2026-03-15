import pg from 'pg';

const { Pool } = pg;

const ssl =
  process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

export async function ensureAuditTables(): Promise<void> {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      executor TEXT NOT NULL DEFAULT 'github-actions',
      mode TEXT NOT NULL CHECK (mode IN ('full', 'category')),
      category TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      baseline_repo TEXT NOT NULL,
      baseline_ref TEXT NOT NULL,
      baseline_sha TEXT,
      submission_repo TEXT NOT NULL,
      submission_ref TEXT NOT NULL,
      submission_sha TEXT,
      github_workflow_run_id BIGINT,
      github_workflow_attempt INTEGER,
      github_workflow_url TEXT,
      summary_json JSONB,
      comparison_json JSONB,
      progress_json JSONB,
      error TEXT,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS executor TEXT NOT NULL DEFAULT 'github-actions'`);
  await pool.query('ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS progress_json JSONB');
  await pool.query('ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await pool.query('ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS github_workflow_run_id BIGINT');
  await pool.query('ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS github_workflow_attempt INTEGER');
  await pool.query('ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS github_workflow_url TEXT');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_artifacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      body BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(run_id, name)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_run_events (
      id BIGSERIAL PRIMARY KEY,
      run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      phase TEXT,
      target_label TEXT,
      category_id TEXT,
      command_id TEXT,
      stream TEXT,
      message TEXT NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS audit_run_events_run_id_id_idx
    ON audit_run_events (run_id, id)
  `);
}

export async function closeAuditPool(): Promise<void> {
  await pool.end();
}
