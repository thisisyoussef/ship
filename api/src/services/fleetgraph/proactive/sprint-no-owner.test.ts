import { describe, expect, it } from 'vitest'

import {
  buildSprintNoOwnerFindingDraft,
  buildSprintNoOwnerFindingKey,
  selectSprintNoOwnerCandidate,
  type SprintNoOwnerCandidate,
} from './sprint-no-owner.js'

const BASE_START_DATE = '2026-03-10T00:00:00.000Z'

function makeWeeksResponse(overrides: {
  weeks: Array<{
    id: string
    issue_count?: number
    name: string
    owner: { id: string; name: string } | null
    sprint_number: number
    status: 'planning' | 'active' | 'completed'
  }>
}) {
  return {
    weeks: overrides.weeks.map((week) => ({
      issue_count: 0,
      workspace_sprint_start_date: BASE_START_DATE,
      ...week,
    })),
    workspace_sprint_start_date: BASE_START_DATE,
  }
}

describe('selectSprintNoOwnerCandidate', () => {
  it('returns null when all weeks are completed', () => {
    const response = makeWeeksResponse({
      weeks: [
        {
          id: 'week-1',
          name: 'Week 1',
          owner: null,
          sprint_number: 1,
          status: 'completed',
        },
        {
          id: 'week-2',
          name: 'Week 2',
          owner: null,
          sprint_number: 2,
          status: 'completed',
        },
      ],
    })

    const candidate = selectSprintNoOwnerCandidate(
      response,
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).toBeNull()
  })

  it('returns null when no week has owner === null', () => {
    const response = makeWeeksResponse({
      weeks: [
        {
          id: 'week-1',
          name: 'Week 1',
          owner: { id: 'person-1', name: 'Morgan PM' },
          sprint_number: 1,
          status: 'planning',
        },
        {
          id: 'week-2',
          name: 'Week 2',
          owner: { id: 'person-2', name: 'Alex PM' },
          sprint_number: 2,
          status: 'active',
        },
      ],
    })

    const candidate = selectSprintNoOwnerCandidate(
      response,
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).toBeNull()
  })

  it('returns null for a week with an owner set', () => {
    const response = makeWeeksResponse({
      weeks: [
        {
          id: 'week-1',
          name: 'Week 1',
          owner: { id: 'person-1', name: 'Jordan' },
          sprint_number: 1,
          status: 'active',
        },
      ],
    })

    const candidate = selectSprintNoOwnerCandidate(
      response,
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).toBeNull()
  })

  it('skips weeks whose start date is in the future', () => {
    // sprint_number: 9 → base + 8 weeks = 2026-03-10 + 56 days = 2026-05-05
    const response = makeWeeksResponse({
      weeks: [
        {
          id: 'week-future',
          name: 'Future Week',
          owner: null,
          sprint_number: 9,
          status: 'planning',
        },
      ],
    })

    const candidate = selectSprintNoOwnerCandidate(
      response,
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).toBeNull()
  })

  it('returns the earliest sprint-no-owner candidate when multiple match', () => {
    const response = makeWeeksResponse({
      weeks: [
        {
          id: 'week-2',
          name: 'Week 2',
          owner: null,
          sprint_number: 2,
          status: 'active',
        },
        {
          id: 'week-1',
          name: 'Week 1',
          owner: null,
          sprint_number: 1,
          status: 'planning',
        },
      ],
    })

    const candidate = selectSprintNoOwnerCandidate(
      response,
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).not.toBeNull()
    expect(candidate?.week.id).toBe('week-1')
    expect(candidate?.statusReason).toBe('no_owner')
  })

  it('returns candidate for an active week with no owner', () => {
    const response = makeWeeksResponse({
      weeks: [
        {
          id: 'week-active',
          name: 'Active Ownerless',
          owner: null,
          sprint_number: 1,
          status: 'active',
        },
      ],
    })

    const candidate = selectSprintNoOwnerCandidate(
      response,
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).toMatchObject({
      statusReason: 'no_owner',
      week: { id: 'week-active' },
    })
  })

  it('returns candidate for a planning week with no owner', () => {
    const response = makeWeeksResponse({
      weeks: [
        {
          id: 'week-planning',
          name: 'Planning Ownerless',
          owner: null,
          sprint_number: 1,
          status: 'planning',
        },
      ],
    })

    const candidate = selectSprintNoOwnerCandidate(
      response,
      new Date('2026-03-17T12:00:00.000Z')
    )

    expect(candidate).toMatchObject({
      statusReason: 'no_owner',
      week: { id: 'week-planning' },
    })
  })
})

describe('buildSprintNoOwnerFindingKey', () => {
  it('returns correct format', () => {
    expect(buildSprintNoOwnerFindingKey('workspace-1', 'week-1'))
      .toBe('sprint-no-owner:workspace-1:week-1')
  })

  it('includes both workspace and week id in key', () => {
    expect(buildSprintNoOwnerFindingKey('ws-abc', 'wk-xyz'))
      .toBe('sprint-no-owner:ws-abc:wk-xyz')
  })
})

describe('buildSprintNoOwnerFindingDraft', () => {
  const candidate: SprintNoOwnerCandidate = {
    startDate: new Date('2026-03-10T00:00:00.000Z'),
    statusReason: 'no_owner',
    week: {
      id: 'week-abc',
      issue_count: 3,
      name: 'Sprint 1',
      owner: null,
      sprint_number: 1,
      status: 'active',
      workspace_sprint_start_date: BASE_START_DATE,
    },
  }

  it('sets findingKey to sprint-no-owner:{workspaceId}:{weekId}', () => {
    const draft = buildSprintNoOwnerFindingDraft(candidate, 'ws-1', 'Advisory sentence.')
    expect(draft.findingKey).toBe('sprint-no-owner:ws-1:week-abc')
  })

  it('sets title to No owner: {weekName}', () => {
    const draft = buildSprintNoOwnerFindingDraft(candidate, 'ws-1', 'Advisory sentence.')
    expect(draft.title).toBe('Sprint owner gap: Sprint 1')
  })

  it('sets recommendedAction.type to assign_owner', () => {
    const draft = buildSprintNoOwnerFindingDraft(candidate, 'ws-1', 'Advisory sentence.')
    expect(draft.recommendedAction.type).toBe('assign_owner')
  })

  it('sets recommendedAction.endpoint.method to PATCH', () => {
    const draft = buildSprintNoOwnerFindingDraft(candidate, 'ws-1', 'Advisory sentence.')
    expect(draft.recommendedAction.endpoint.method).toBe('PATCH')
  })

  it('sets recommendedAction.endpoint.path to contain the week id', () => {
    const draft = buildSprintNoOwnerFindingDraft(candidate, 'ws-1', 'Advisory sentence.')
    expect(draft.recommendedAction.endpoint.path).toContain('week-abc')
  })

  it('includes accountability-focused evidence for the missing owner gap', () => {
    const draft = buildSprintNoOwnerFindingDraft(candidate, 'ws-1', 'Advisory sentence.')

    expect(draft.evidence).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/no sprint owner/i),
        expect.stringMatching(/accountable/i),
      ])
    )
  })
})
