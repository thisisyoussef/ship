import type { FleetGraphV2SuspectType, ScoredFinding } from '../types-v2.js'

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null
}

function pushFact(evidence: string[], label: string, value: string | null) {
  if (!value) {
    return
  }

  evidence.push(`${label}: ${value}`)
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatState(value: unknown) {
  const state = readNonEmptyString(value)
  return state ? state.charAt(0).toUpperCase() + state.slice(1) : null
}

function formatDate(value: unknown) {
  const raw = readNonEmptyString(value)
  if (!raw) {
    return null
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return raw
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date)
}

function formatDurationFromHours(value: unknown) {
  const hours = readFiniteNumber(value)
  if (hours === null || hours < 0) {
    return readNonEmptyString(value)
  }

  const roundedHours = Math.round(hours)
  if (roundedHours < 24) {
    return pluralize(roundedHours, 'hour')
  }

  const days = Math.floor(roundedHours / 24)
  const remainingHours = roundedHours % 24
  if (remainingHours === 0) {
    return pluralize(days, 'day')
  }

  return `${pluralize(days, 'day')}, ${pluralize(remainingHours, 'hour')}`
}

function formatDays(value: unknown, noun = 'day') {
  const days = readFiniteNumber(value)
  return days === null ? readNonEmptyString(value) : pluralize(Math.round(days), noun)
}

function formatInteger(value: unknown) {
  const number = readFiniteNumber(value)
  return number === null ? readNonEmptyString(value) : String(Math.round(number))
}

function formatPercent(value: unknown) {
  const number = readFiniteNumber(value)
  return number === null ? readNonEmptyString(value) : `${Math.round(number * 100)}%`
}

function formatRatio(value: unknown) {
  const number = readFiniteNumber(value)
  return number === null ? readNonEmptyString(value) : `${number.toFixed(1)}x`
}

function formatHourOfDay(value: unknown) {
  const hour = readFiniteNumber(value)
  if (hour === null) {
    return readNonEmptyString(value)
  }

  const normalizedHour = Math.max(0, Math.min(23, Math.round(hour)))
  const suffix = normalizedHour >= 12 ? 'PM' : 'AM'
  const twelveHour = normalizedHour % 12 || 12
  return `${twelveHour}:00 ${suffix}`
}

function humanizeKey(rawKey: string) {
  return rawKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase())
}

function formatGenericValue(key: string, value: unknown) {
  if (key.toLowerCase().includes('date') || key.endsWith('At')) {
    return formatDate(value)
  }
  if (key.toLowerCase().includes('hour')) {
    return formatDurationFromHours(value)
  }
  if (key.toLowerCase().includes('percent')) {
    return formatPercent(value)
  }
  if (key.toLowerCase().includes('status') || key === 'state') {
    return formatState(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (typeof value === 'number') {
    return String(Math.round(value * 10) / 10)
  }
  return readNonEmptyString(value)
}

function buildWeekStartDriftEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(evidence, 'Week name', readNonEmptyString(metadata.weekTitle) ?? readNonEmptyString(metadata.entityTitle))
  pushFact(evidence, 'Time since planned start', formatDurationFromHours(metadata.hoursSinceStart))
  pushFact(evidence, 'Scheduled start', formatDate(metadata.sprintStartDate))
  pushFact(evidence, 'Current Ship status', formatState(metadata.status))
  return evidence
}

function buildEmptyActiveWeekEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(evidence, 'Week name', readNonEmptyString(metadata.weekTitle) ?? readNonEmptyString(metadata.entityTitle))
  pushFact(evidence, 'Week status', formatState(metadata.status))
  pushFact(evidence, 'Scoped issues', formatInteger(metadata.issueCount))
  return evidence
}

function buildMissingStandupEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(evidence, 'Team member', readNonEmptyString(metadata.personName))
  pushFact(evidence, 'Open work items', formatInteger(metadata.openIssueCount))
  pushFact(evidence, 'Standup due by', formatHourOfDay(metadata.dueHour))
  return evidence
}

function buildApprovalGapEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(
    evidence,
    'Approval requested',
    readNonEmptyString(metadata.approvalType)?.replace(/^\w/, (character) => character.toUpperCase()) ?? null
  )
  pushFact(
    evidence,
    'Waiting for approval',
    formatDays(metadata.businessDaysSinceSubmission, 'business day')
  )
  pushFact(evidence, 'Submitted', formatDate(metadata.submittedAt))
  pushFact(evidence, 'Current approval state', formatState(metadata.state))

  const feedback = readNonEmptyString(metadata.feedback)
  if (feedback) {
    evidence.push(`Latest feedback: ${feedback}`)
  }

  return evidence
}

function buildDeadlineRiskEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(evidence, 'Project', readNonEmptyString(metadata.projectTitle) ?? readNonEmptyString(metadata.entityTitle))
  pushFact(evidence, 'Target date', formatDate(metadata.targetDate))
  pushFact(evidence, 'Schedule buffer', formatDays(metadata.daysUntil))
  pushFact(evidence, 'Open issues remaining', formatInteger(metadata.openIssueCount))

  if (metadata.hasStaleHighPriority === true) {
    evidence.push('At least one high-priority issue has gone stale.')
  }

  return evidence
}

function buildWorkloadImbalanceEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(evidence, 'Team member', readNonEmptyString(metadata.personName))
  pushFact(evidence, 'Share of open work', formatPercent(metadata.percentOfTotal))
  pushFact(evidence, 'Load vs typical teammate', formatRatio(metadata.ratioToMedian))
  pushFact(evidence, 'Estimated workload', formatInteger(metadata.workload))
  return evidence
}

function buildBlockerAgingEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(evidence, 'Issue', readNonEmptyString(metadata.issueTitle) ?? readNonEmptyString(metadata.entityTitle))
  pushFact(evidence, 'Blocker age', formatDays(metadata.businessDaysSinceUpdate, 'business day'))
  pushFact(evidence, 'Last meaningful update', formatDate(metadata.lastUpdatedAt))

  const blockerText = readNonEmptyString(metadata.blockerText)
  if (blockerText) {
    evidence.push(`Current blocker: ${blockerText}`)
  }

  return evidence
}

function buildSprintNoOwnerEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(evidence, 'Week', readNonEmptyString(metadata.weekTitle) ?? readNonEmptyString(metadata.entityTitle))
  pushFact(evidence, 'Status', formatState(metadata.status))
  pushFact(evidence, 'Scoped issues', formatInteger(metadata.issueCount))
  evidence.push('No owner is assigned to this week.')
  return evidence
}

function buildUnassignedSprintIssuesEvidence(metadata: Record<string, unknown>) {
  const evidence: string[] = []
  pushFact(evidence, 'Week', readNonEmptyString(metadata.weekTitle) ?? readNonEmptyString(metadata.entityTitle))
  pushFact(evidence, 'Unassigned issues', formatInteger(metadata.unassignedCount))
  pushFact(evidence, 'Total issues', formatInteger(metadata.totalCount))
  pushFact(evidence, 'Status', formatState(metadata.status))
  return evidence
}

function buildGenericEvidence(
  scored: ScoredFinding,
  metadata: Record<string, unknown>
) {
  const evidence = Object.entries(metadata)
    .map(([key, value]) => {
      const formatted = formatGenericValue(key, value)
      return formatted ? `${humanizeKey(key)}: ${formatted}` : null
    })
    .filter((value): value is string => value !== null)
    .slice(0, 4)

  if (evidence.length > 0) {
    return evidence
  }

  return [
    `Finding type: ${humanizeKey(scored.findingType)}`,
    `Target entity: ${scored.targetEntityId}`,
  ]
}

export function buildFindingEvidence(
  findingType: FleetGraphV2SuspectType,
  scored: ScoredFinding,
  metadata: Record<string, unknown>
) {
  switch (findingType) {
    case 'week_start_drift':
      return buildWeekStartDriftEvidence(metadata)
    case 'empty_active_week':
      return buildEmptyActiveWeekEvidence(metadata)
    case 'missing_standup':
      return buildMissingStandupEvidence(metadata)
    case 'approval_gap':
      return buildApprovalGapEvidence(metadata)
    case 'deadline_risk':
      return buildDeadlineRiskEvidence(metadata)
    case 'workload_imbalance':
      return buildWorkloadImbalanceEvidence(metadata)
    case 'blocker_aging':
      return buildBlockerAgingEvidence(metadata)
    case 'sprint_no_owner':
      return buildSprintNoOwnerEvidence(metadata)
    case 'unassigned_sprint_issues':
      return buildUnassignedSprintIssuesEvidence(metadata)
    default:
      return buildGenericEvidence(scored, metadata)
  }
}
