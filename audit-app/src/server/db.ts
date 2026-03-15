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
      mode TEXT NOT NULL CHECK (mode IN ('full', 'category')),
      category TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      baseline_repo TEXT NOT NULL,
      baseline_ref TEXT NOT NULL,
      baseline_sha TEXT,
      submission_repo TEXT NOT NULL,
      submission_ref TEXT NOT NULL,
      submission_sha TEXT,
      summary_json JSONB,
      comparison_json JSONB,
      error TEXT,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ
    )
  `);
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
}

export async function closeAuditPool(): Promise<void> {
  await pool.end();
}
