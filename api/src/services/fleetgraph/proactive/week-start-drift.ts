import type { FleetGraphRequestedAction } from '../entry/contracts.js'
import type {
  FleetGraphProactiveFindingDraft,
  WeekStartDriftCandidate,
} from './types.js'

interface ShipWeeksResponse {
  weeks: Array<{
    has_plan?: boolean
    id: string
    issue_count: number
    name: string
    owner: {
      email?: string
      id: string
      name: string
    } | null
    program_name?: string | null
    sprint_number: number
    status: 'planning' | 'active' | 'completed'
    workspace_sprint_start_date: string
  }>
  workspace_sprint_start_date: string
}

export function selectWeekStartDriftCandidate(
  response: ShipWeeksResponse,
  now: Date
): WeekStartDriftCandidate | null {
  const candidates = response.weeks
    .map((week) => {
      if (week.status === 'completed') {
        return null
      }

      const startDate = calculateWeekStartDate(
        response.workspace_sprint_start_date,
        week.sprint_number
      )
      if (startDate > now) {
        return null
      }

      if (week.status === 'planning') {
        return {
          startDate,
          statusReason: 'planning_after_start' as const,
          week,
        }
      }

      if (week.issue_count === 0) {
        return {
          startDate,
          statusReason: 'zero_issues_after_start' as const,
          week,
        }
      }

      return null
    })
    .filter((candidate): candidate is WeekStartDriftCandidate => Boolean(candidate))
    .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())

  return candidates[0] ?? null
}

export function buildWeekStartFindingDraft(
  candidate: WeekStartDriftCandidate,
  workspaceId: string,
  summary: string
): FleetGraphProactiveFindingDraft {
  return {
    evidence: buildWeekStartEvidence(candidate),
    findingKey: buildWeekStartFindingKey(workspaceId, candidate.week.id),
    metadata: {
      issueCount: candidate.week.issue_count,
      programName: candidate.week.program_name ?? null,
      sprintNumber: candidate.week.sprint_number,
      startDate: candidate.startDate.toISOString(),
      statusReason: candidate.statusReason,
    },
    recommendedAction: buildWeekStartRecommendedAction(candidate),
    summary,
    title: `Week start drift: ${candidate.week.name}`,
  }
}

export function buildWeekStartFindingKey(
  workspaceId: string,
  weekId: string
) {
  return `week-start-drift:${workspaceId}:${weekId}`
}

export function buildWeekStartRecommendedAction(
  candidate: WeekStartDriftCandidate
): FleetGraphRequestedAction {
  return {
    endpoint: {
      method: 'POST',
      path: `/api/weeks/${candidate.week.id}/start`,
    },
    evidence: buildWeekStartEvidence(candidate),
    rationale: 'Starting the week is a consequential Ship mutation and should stay behind human confirmation.',
    summary: 'Start this week once the owner confirms the scope is ready.',
    targetId: candidate.week.id,
    targetType: 'sprint',
    title: 'Start week',
    type: 'start_week',
  }
}

function buildWeekStartEvidence(candidate: WeekStartDriftCandidate) {
  const reason = candidate.statusReason === 'planning_after_start'
    ? 'The week is still in planning even though its start date has passed.'
    : 'The week has reached its start window but still has zero linked issues.'

  return [
    reason,
    `Week ${candidate.week.sprint_number} started on ${candidate.startDate.toISOString().slice(0, 10)}.`,
    candidate.week.owner
      ? `Current owner: ${candidate.week.owner.name}.`
      : 'No week owner is set on the current Ship week.',
  ]
}

function calculateWeekStartDate(
  workspaceSprintStartDate: string,
  sprintNumber: number
) {
  const baseDate = new Date(`${workspaceSprintStartDate.slice(0, 10)}T00:00:00.000Z`)
  const startDate = new Date(baseDate)
  startDate.setUTCDate(baseDate.getUTCDate() + (sprintNumber - 1) * 7)
  return startDate
}
