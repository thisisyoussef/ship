import { describe, expect, it } from 'vitest'

import {
  buildUnassignedIssuesFindingKey,
  selectUnassignedIssuesCandidate,
} from './unassigned-issues.js'
import type { ShipSprintIssuesResponse } from './types.js'

const BASE_START_DATE = '2026-03-10T00:00:00.000Z'

function makeWeeksResponse(overrides: {
  weeks: Array<{
    id: string
    issue_count?: number
    name: string
    owner?: { id: string; name: string } | null
    sprint_number: number
    status: 'planning' | 'active' | 'completed'
  }>
}) {
  return {
    weeks: overrides.weeks.map((week) => ({
      issue_count: 0,
      owner: null,
      workspace_sprint_start_date: BASE_START_DATE,
      ...week,
    })),
    workspace_sprint_start_date: BASE_START_DATE,
  }
}

function makeIssues(
  total: number,
  unassignedCount: number
): ShipSprintIssuesResponse {
  return {
    issues: Array.from({ length: total }, (_, i) => ({
      assignee_id: i < unassignedCount ? null : `user-${i}`,
      id: `issue-${i}`,
      status: 'open',
      title: `Issue ${i}`,
    })),
  }
}

const NOW = new Date('2026-03-17T12:00:00.000Z')

describe('selectUnassignedIssuesCandidate', () => {
  it('returns null when unassigned count is less than 3', () => {
    const weeks = makeWeeksResponse({
      weeks: [
        { id: 'week-1', name: 'Sprint 1', sprint_number: 1, status: 'active' },
      ],
    })
    const issues = makeIssues(5, 2)

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate).toBeNull()
  })

  it('returns null when unassigned count is exactly 0', () => {
    const weeks = makeWeeksResponse({
      weeks: [
        { id: 'week-1', name: 'Sprint 1', sprint_number: 1, status: 'active' },
      ],
    })
    const issues = makeIssues(5, 0)

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate).toBeNull()
  })

  it('returns candidate when unassigned count is exactly 3', () => {
    const weeks = makeWeeksResponse({
      weeks: [
        { id: 'week-1', name: 'Sprint 1', sprint_number: 1, status: 'active' },
      ],
    })
    const issues = makeIssues(5, 3)

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate).not.toBeNull()
    expect(candidate?.unassignedCount).toBe(3)
    expect(candidate?.totalCount).toBe(5)
    expect(candidate?.week.id).toBe('week-1')
  })

  it('returns candidate when unassigned count is greater than 3', () => {
    const weeks = makeWeeksResponse({
      weeks: [
        { id: 'week-1', name: 'Sprint 1', sprint_number: 1, status: 'active' },
      ],
    })
    const issues = makeIssues(10, 7)

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate).not.toBeNull()
    expect(candidate?.unassignedCount).toBe(7)
    expect(candidate?.totalCount).toBe(10)
  })

  it('prefers active sprint over planning sprint', () => {
    const weeks = makeWeeksResponse({
      weeks: [
        // sprint_number 1 = 2026-03-10 (past)
        { id: 'week-planning', name: 'Sprint 1 Planning', sprint_number: 1, status: 'planning' },
        // sprint_number 2 = 2026-03-17 (today, exactly at boundary — at 00:00 UTC, now is 12:00 UTC so it's past)
        { id: 'week-active', name: 'Sprint 2 Active', sprint_number: 2, status: 'active' },
      ],
    })
    const issues = makeIssues(5, 3)

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate).not.toBeNull()
    expect(candidate?.week.id).toBe('week-active')
  })

  it('returns null when no sprint has passed its start date', () => {
    // sprint_number 9 = 2026-03-10 + 8*7 = 2026-05-05 (future)
    const weeks = makeWeeksResponse({
      weeks: [
        { id: 'week-future', name: 'Sprint 9', sprint_number: 9, status: 'active' },
      ],
    })
    const issues = makeIssues(5, 4)

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate).toBeNull()
  })

  it('returns null when the only eligible sprint is completed', () => {
    const weeks = makeWeeksResponse({
      weeks: [
        { id: 'week-1', name: 'Sprint 1', sprint_number: 1, status: 'completed' },
      ],
    })
    const issues = makeIssues(5, 4)

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate).toBeNull()
  })

  it('returns null when there are no weeks', () => {
    const weeks = makeWeeksResponse({ weeks: [] })
    const issues = makeIssues(5, 4)

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate).toBeNull()
  })

  it('correctly counts only issues with null assignee_id', () => {
    const weeks = makeWeeksResponse({
      weeks: [
        { id: 'week-1', name: 'Sprint 1', sprint_number: 1, status: 'active' },
      ],
    })
    const issues: ShipSprintIssuesResponse = {
      issues: [
        { assignee_id: null, id: 'i-1', status: 'open', title: 'Issue 1' },
        { assignee_id: null, id: 'i-2', status: 'open', title: 'Issue 2' },
        { assignee_id: null, id: 'i-3', status: 'open', title: 'Issue 3' },
        { assignee_id: 'user-a', id: 'i-4', status: 'open', title: 'Issue 4' },
        { assignee_id: 'user-b', id: 'i-5', status: 'open', title: 'Issue 5' },
      ],
    }

    const candidate = selectUnassignedIssuesCandidate(weeks, issues, NOW)

    expect(candidate?.unassignedCount).toBe(3)
    expect(candidate?.totalCount).toBe(5)
  })
})

describe('buildUnassignedIssuesFindingKey', () => {
  it('returns correct format', () => {
    expect(buildUnassignedIssuesFindingKey('workspace-1', 'sprint-1'))
      .toBe('unassigned-issues:workspace-1:sprint-1')
  })

  it('includes both workspace and sprint id in key', () => {
    expect(buildUnassignedIssuesFindingKey('ws-abc', 'wk-xyz'))
      .toBe('unassigned-issues:ws-abc:wk-xyz')
  })
})
