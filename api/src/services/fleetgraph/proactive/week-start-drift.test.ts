import { describe, expect, it } from 'vitest'

import {
  buildWeekStartFindingKey,
  selectWeekStartDriftCandidate,
} from './week-start-drift.js'

function createWeeksResponse() {
  return {
    weeks: [
      {
        id: 'week-future',
        issue_count: 0,
        name: 'Future Week',
        owner: null,
        sprint_number: 9,
        status: 'planning' as const,
        workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
      },
      {
        id: 'week-current',
        issue_count: 0,
        name: 'Current Week',
        owner: { id: 'person-1', name: 'Morgan PM' },
        program_name: 'North Star',
        sprint_number: 1,
        status: 'planning' as const,
        workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
      },
    ],
    workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
  }
}

describe('week-start drift candidate selection', () => {
  it('picks the overdue planning week and ignores future weeks', () => {
    const candidate = selectWeekStartDriftCandidate(
      createWeeksResponse(),
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).toMatchObject({
      statusReason: 'planning_after_start',
      week: {
        id: 'week-current',
        name: 'Current Week',
      },
    })
  })

  it('returns quiet when no overdue planning or empty week exists', () => {
    const candidate = selectWeekStartDriftCandidate(
      {
        weeks: [
          {
            id: 'week-active',
            issue_count: 4,
            name: 'Active Week',
            owner: null,
            sprint_number: 1,
            status: 'active',
            workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
          },
        ],
        workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
      },
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).toBeNull()
  })

  it('builds stable finding keys per workspace and week', () => {
    expect(buildWeekStartFindingKey('workspace-1', 'week-1'))
      .toBe('week-start-drift:workspace-1:week-1')
  })
})
