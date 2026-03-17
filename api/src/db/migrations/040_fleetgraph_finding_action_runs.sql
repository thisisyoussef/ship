CREATE TABLE IF NOT EXISTS fleetgraph_finding_action_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES fleetgraph_proactive_findings(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('start_week')),
  endpoint_method TEXT NOT NULL CHECK (endpoint_method IN ('POST')),
  endpoint_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'applied', 'already_applied', 'failed')),
  outcome_message TEXT NOT NULL,
  result_status_code INTEGER,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (finding_id, action_type)
);

CREATE INDEX IF NOT EXISTS fleetgraph_finding_action_runs_workspace_idx
  ON fleetgraph_finding_action_runs (workspace_id, updated_at DESC);
