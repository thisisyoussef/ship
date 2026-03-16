CREATE TABLE IF NOT EXISTS fleetgraph_queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('proactive', 'on_demand')),
  trigger TEXT NOT NULL CHECK (trigger IN ('document-context', 'event', 'scheduled-sweep')),
  dedupe_key TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  document_id TEXT,
  document_type TEXT,
  actor_id TEXT,
  route_surface TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fleetgraph_queue_jobs_status_available_idx
  ON fleetgraph_queue_jobs (status, available_at, created_at);

CREATE INDEX IF NOT EXISTS fleetgraph_queue_jobs_workspace_idx
  ON fleetgraph_queue_jobs (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fleetgraph_dedupe_ledger (
  dedupe_key TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  last_job_id UUID REFERENCES fleetgraph_queue_jobs(id) ON DELETE SET NULL,
  last_enqueued_at TIMESTAMPTZ,
  last_started_at TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ,
  last_outcome TEXT CHECK (last_outcome IN ('quiet', 'advisory', 'approval_required', 'fallback', 'failed')),
  checkpoint_branch TEXT,
  checkpoint_outcome TEXT,
  checkpoint_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_eligible_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fleetgraph_dedupe_ledger_workspace_idx
  ON fleetgraph_dedupe_ledger (workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS fleetgraph_sweep_schedules (
  workspace_id TEXT PRIMARY KEY,
  next_sweep_at TIMESTAMPTZ NOT NULL,
  last_swept_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fleetgraph_sweep_schedules_due_idx
  ON fleetgraph_sweep_schedules (enabled, next_sweep_at);
