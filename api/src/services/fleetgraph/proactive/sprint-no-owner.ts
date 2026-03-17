import type { FleetGraphRequestedAction } from '../entry/contracts.js'
import type { FleetGraphProactiveFindingDraft } from './types.js'

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

export interface SprintNoOwnerCandidate {
  startDate: Date
  statusReason: 'no_owner'
  week: ShipWeeksResponse['weeks'][number]
}

export function selectSprintNoOwnerCandidate(
  response: ShipWeeksResponse,
  now: Date
): SprintNoOwnerCandidate | null {
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

      if (week.owner === null && (week.status === 'planning' || week.status === 'active')) {
        return {
          startDate,
          statusReason: 'no_owner' as const,
          week,
        }
      }

      return null
    })
    .filter((candidate): candidate is SprintNoOwnerCandidate => Boolean(candidate))
    .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())

  return candidates[0] ?? null
}

export function buildSprintNoOwnerFindingDraft(
  candidate: SprintNoOwnerCandidate,
  workspaceId: string,
  summary: string
): FleetGraphProactiveFindingDraft {
  const evidence = buildSprintNoOwnerEvidence(candidate)
  return {
    evidence,
    findingKey: buildSprintNoOwnerFindingKey(workspaceId, candidate.week.id),
    metadata: {
      issueCount: candidate.week.issue_count,
      sprintNumber: candidate.week.sprint_number,
      startDate: candidate.startDate.toISOString(),
      statusReason: candidate.statusReason,
    },
    recommendedAction: buildSprintNoOwnerRecommendedAction(candidate, evidence),
    summary,
    title: `No owner: ${candidate.week.name}`,
  }
}

export function buildSprintNoOwnerFindingKey(
  workspaceId: string,
  weekId: string
): string {
  return `sprint-no-owner:${workspaceId}:${weekId}`
}

function buildSprintNoOwnerEvidence(candidate: SprintNoOwnerCandidate): string[] {
  return [
    'This sprint has no owner assigned.',
    `Sprint ${candidate.week.sprint_number} started on ${candidate.startDate.toISOString().slice(0, 10)}.`,
    'No week owner is set — someone should be accountable for this sprint.',
  ]
}

function buildSprintNoOwnerRecommendedAction(
  candidate: SprintNoOwnerCandidate,
  evidence: string[]
): FleetGraphRequestedAction {
  return {
    endpoint: {
      method: 'PATCH',
      path: `/api/documents/${candidate.week.id}`,
    },
    evidence,
    rationale: 'Starting the week is a consequential Ship mutation and should stay behind human confirmation.',
    summary: 'Assign an owner to this sprint so someone is accountable.',
    targetId: candidate.week.id,
    targetType: 'sprint',
    title: 'Assign sprint owner',
    type: 'assign_owner',
  }
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
