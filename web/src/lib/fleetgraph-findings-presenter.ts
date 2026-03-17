import type { FleetGraphFinding } from './fleetgraph-findings';

export function formatFleetGraphTimestamp(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString();
}

export function renderFindingStatus(finding: FleetGraphFinding) {
  if (finding.snoozedUntil) {
    return `Snoozed until ${formatFleetGraphTimestamp(finding.snoozedUntil)}`;
  }
  if (finding.cooldownUntil) {
    return `Cooldown recorded ${formatFleetGraphTimestamp(finding.cooldownUntil)}`;
  }
  return `Updated ${formatFleetGraphTimestamp(finding.updatedAt)}`;
}

export function renderExecutionTone(finding: FleetGraphFinding) {
  switch (finding.actionExecution?.status) {
    case 'applied':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'already_applied':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-900';
  }
}

export function renderExecutionLabel(finding: FleetGraphFinding) {
  switch (finding.actionExecution?.status) {
    case 'applied':
      return 'Started in Ship';
    case 'already_applied':
      return 'Already started';
    case 'failed':
      return 'Could not start week';
    case 'pending':
      return 'Starting in Ship';
    default:
      return 'Suggested next step';
  }
}

function readWeekStartStatusReason(finding: FleetGraphFinding) {
  const value = finding.metadata?.statusReason;
  return typeof value === 'string' ? value : null;
}

export function buildFindingSummary(finding: FleetGraphFinding) {
  if (finding.findingType !== 'week_start_drift') {
    return finding.summary;
  }

  switch (readWeekStartStatusReason(finding)) {
    case 'planning_after_start':
      return 'This week should be underway by now, but it is still marked as planning.';
    case 'zero_issues_after_start':
      return 'This week has reached its start window, but it still has no linked work.';
    default:
      return finding.summary;
  }
}

export function buildDismissNotice() {
  return 'Hidden for now. FleetGraph will only bring this back if a new signal shows up.';
}

export function buildSnoozeNotice(snoozedUntil?: string) {
  const timestamp = formatFleetGraphTimestamp(snoozedUntil);
  if (!timestamp) {
    return 'Snoozed for 4 hours. FleetGraph will stay quiet until the snooze expires.';
  }

  return `Snoozed until ${timestamp}. FleetGraph will stay quiet until then.`;
}

export function buildApplyNotice(finding: FleetGraphFinding) {
  switch (finding.actionExecution?.status) {
    case 'applied':
      return 'Week started in Ship.';
    case 'already_applied':
      return 'This week was already active in Ship.';
    default:
      return null;
  }
}
