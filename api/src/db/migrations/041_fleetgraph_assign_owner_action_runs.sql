ALTER TABLE fleetgraph_finding_action_runs
  DROP CONSTRAINT IF EXISTS fleetgraph_finding_action_runs_action_type_check;

ALTER TABLE fleetgraph_finding_action_runs
  ADD CONSTRAINT fleetgraph_finding_action_runs_action_type_check
  CHECK (action_type IN ('assign_owner', 'start_week'));

ALTER TABLE fleetgraph_finding_action_runs
  DROP CONSTRAINT IF EXISTS fleetgraph_finding_action_runs_endpoint_method_check;

ALTER TABLE fleetgraph_finding_action_runs
  ADD CONSTRAINT fleetgraph_finding_action_runs_endpoint_method_check
  CHECK (endpoint_method IN ('PATCH', 'POST'));
