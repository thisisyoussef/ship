ALTER TABLE fleetgraph_proactive_findings
  DROP CONSTRAINT IF EXISTS fleetgraph_proactive_findings_finding_type_check;

ALTER TABLE fleetgraph_proactive_findings
  ADD CONSTRAINT fleetgraph_proactive_findings_finding_type_check
  CHECK (finding_type IN (
    'approval_gap',
    'blocker_aging',
    'deadline_risk',
    'empty_active_week',
    'missing_standup',
    'sprint_no_owner',
    'unassigned_sprint_issues',
    'week_start_drift',
    'workload_imbalance'
  ));

ALTER TABLE fleetgraph_finding_action_runs
  DROP CONSTRAINT IF EXISTS fleetgraph_finding_action_runs_action_type_check;

ALTER TABLE fleetgraph_finding_action_runs
  ADD CONSTRAINT fleetgraph_finding_action_runs_action_type_check
  CHECK (action_type IN (
    'approve_project_plan',
    'approve_week_plan',
    'assign_issues',
    'assign_owner',
    'escalate_risk',
    'post_comment',
    'post_standup',
    'rebalance_load',
    'start_week'
  ));

ALTER TABLE fleetgraph_finding_action_runs
  DROP CONSTRAINT IF EXISTS fleetgraph_finding_action_runs_endpoint_method_check;

ALTER TABLE fleetgraph_finding_action_runs
  ADD CONSTRAINT fleetgraph_finding_action_runs_endpoint_method_check
  CHECK (endpoint_method IN ('DELETE', 'PATCH', 'POST'));
