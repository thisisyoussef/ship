import { z } from 'zod'

import type { FleetGraphRequestedAction } from '../entry/contracts.js'
import type { FleetGraphProactiveFindingDraft } from './types.js'
import {
  ShipWeekSummarySchema,
  type ShipSprintIssuesResponse,
} from './types.js'
import { calculateWeekStartDate } from './sprint-utils.js'

interface ShipWeeksResponse {
  weeks: Array<z.infer<typeof ShipWeekSummarySchema>>
  workspace_sprint_start_date: string
}

export type WeekSummary = z.infer<typeof ShipWeekSummarySchema>

export interface UnassignedIssuesCandidate {
  issueIds: string[]
  startDate: Date
  totalCount: number
  unassignedCount: number
  week: WeekSummary
}

export function selectUnassignedIssuesCandidate(
  weeks: ShipWeeksResponse,
  issues: ShipSprintIssuesResponse,
  now: Date
): UnassignedIssuesCandidate | null {
  // Find active sprint (prefer 'active', fall back to 'planning') whose start has passed
  const eligible = weeks.weeks
    .filter((week) => week.status !== 'completed')
    .map((week) => {
      const startDate = calculateWeekStartDate(
        weeks.workspace_sprint_start_date,
        week.sprint_number
      )
      if (startDate > now) {
        return null
      }
      if (week.status === 'active' || week.status === 'planning') {
        return { startDate, week }
      }
      return null
    })
    .filter((entry): entry is { startDate: Date; week: WeekSummary } => entry !== null)
    .sort((left, right) => {
      // Prefer active over planning
      if (left.week.status === 'active' && right.week.status !== 'active') return -1
      if (right.week.status === 'active' && left.week.status !== 'active') return 1
      // Then sort by start date ascending (earliest first)
      return left.startDate.getTime() - right.startDate.getTime()
    })

  const first = eligible[0]
  if (!first) {
    return null
  }

  const { startDate, week } = first

  const totalCount = issues.issues.length
  const unassignedIssues = issues.issues.filter((issue) => issue.assignee_id === null)
  const unassignedCount = unassignedIssues.length

  if (unassignedCount < 3) {
    return null
  }

  return {
    issueIds: unassignedIssues.map((issue) => issue.id),
    startDate,
    totalCount,
    unassignedCount,
    week,
  }
}

export function buildUnassignedIssuesFindingKey(
  workspaceId: string,
  sprintId: string
): string {
  return `unassigned-issues:${workspaceId}:${sprintId}`
}

export function buildUnassignedIssuesFindingDraft(
  candidate: UnassignedIssuesCandidate,
  workspaceId: string,
  summary: string
): FleetGraphProactiveFindingDraft {
  const evidence = buildUnassignedIssuesEvidence(candidate)
  return {
    evidence,
    findingKey: buildUnassignedIssuesFindingKey(workspaceId, candidate.week.id),
    metadata: {
      issueIds: candidate.issueIds,
      sprintNumber: candidate.week.sprint_number,
      startDate: candidate.startDate.toISOString(),
      totalCount: candidate.totalCount,
      unassignedCount: candidate.unassignedCount,
    },
    recommendedAction: buildUnassignedIssuesRecommendedAction(candidate, evidence),
    summary,
    title: `${candidate.unassignedCount} unassigned issues in ${candidate.week.name}`,
  }
}

function buildUnassignedIssuesEvidence(candidate: UnassignedIssuesCandidate): string[] {
  return [
    `${candidate.unassignedCount} of ${candidate.totalCount} issues in this sprint have no assignee.`,
    `Sprint ${candidate.week.sprint_number} is ${candidate.week.status} and started on ${candidate.startDate.toISOString().slice(0, 10)}.`,
    'Leaving them unassigned makes it harder for the team to coordinate execution.',
  ]
}

function buildUnassignedIssuesRecommendedAction(
  candidate: UnassignedIssuesCandidate,
  evidence: string[]
): FleetGraphRequestedAction {
  return {
    body: {
      issue_ids: candidate.issueIds,
    },
    endpoint: {
      method: 'POST',
      path: '/api/issues/bulk',
    },
    evidence,
    rationale: 'Assignment should remain a human-reviewed action in Ship.',
    summary: 'Assign the unassigned sprint issues or make an explicit call to leave them unassigned.',
    targetId: candidate.week.id,
    targetType: 'sprint',
    title: 'Assign sprint issues',
    type: 'assign_issues',
  }
}
