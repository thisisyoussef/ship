import type { FleetGraphRequestedAction } from '../entry/contracts.js'
import type { FleetGraphProactiveFindingDraft } from './types.js'
import { calculateWeekStartDate } from './sprint-utils.js'

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
      weekStatus: candidate.week.status,
    },
    recommendedAction: buildSprintNoOwnerRecommendedAction(candidate, evidence),
    summary,
    title: `Sprint owner gap: ${candidate.week.name}`,
  }
}

export function buildSprintNoOwnerFindingKey(
  workspaceId: string,
  weekId: string
): string {
  return `sprint-no-owner:${workspaceId}:${weekId}`
}

function buildSprintNoOwnerEvidence(candidate: SprintNoOwnerCandidate): string[] {
  const startedOn = candidate.startDate.toISOString().slice(0, 10)
  const accountabilityLine = candidate.week.issue_count > 0
    ? `This sprint already has ${candidate.week.issue_count} linked issue${candidate.week.issue_count === 1 ? '' : 's'}, but no one is accountable for coordinating it.`
    : 'No one is accountable for coordinating this sprint yet.'

  return [
    'No sprint owner is assigned right now.',
    `Sprint ${candidate.week.sprint_number} is ${candidate.week.status} and started on ${startedOn}.`,
    accountabilityLine,
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
    rationale: 'FleetGraph can surface the missing owner, but assigning accountability should remain a human decision in Ship.',
    summary: 'Name a sprint owner so someone is accountable for coordination and follow-through.',
    targetId: candidate.week.id,
    targetType: 'sprint',
    title: 'Assign sprint owner',
    type: 'assign_owner',
  }
}
