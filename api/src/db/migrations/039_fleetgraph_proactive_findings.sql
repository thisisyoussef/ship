CREATE TABLE IF NOT EXISTS fleetgraph_proactive_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  finding_key TEXT NOT NULL UNIQUE,
  dedupe_key TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  finding_type TEXT NOT NULL CHECK (finding_type IN ('week_start_drift')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved', 'snoozed')),
  document_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_action JSONB,
  trace_run_id TEXT,
  trace_public_url TEXT,
  snoozed_until TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fleetgraph_proactive_findings_workspace_status_idx
  ON fleetgraph_proactive_findings (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS fleetgraph_proactive_findings_document_idx
  ON fleetgraph_proactive_findings (document_id, updated_at DESC);
