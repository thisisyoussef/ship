ALTER TABLE fleetgraph_proactive_findings
  DROP CONSTRAINT IF EXISTS fleetgraph_proactive_findings_finding_type_check;

ALTER TABLE fleetgraph_proactive_findings
  ADD CONSTRAINT fleetgraph_proactive_findings_finding_type_check
  CHECK (
    finding_type IN (
      'sprint_no_owner',
      'unassigned_sprint_issues',
      'week_start_drift'
    )
  );
