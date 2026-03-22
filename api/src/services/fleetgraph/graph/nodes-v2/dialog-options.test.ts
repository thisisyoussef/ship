import { describe, expect, it } from 'vitest'

import type { FleetGraphActionDraft } from '../../actions/registry.js'
import type { FleetGraphStateV2 } from '../state-v2.js'
import { resolveDialogOptions } from './dialog-options.js'

function makeState(overrides: Partial<FleetGraphStateV2> = {}) {
  return {
    rawIssueCluster: null,
    rawPeople: [],
    rawProgramCluster: null,
    rawProjectCluster: null,
    rawWeekCluster: null,
    ...overrides,
  } as FleetGraphStateV2
}

function makeDraft(
  actionType: FleetGraphActionDraft['actionType'],
  targetId: string
): FleetGraphActionDraft {
  return {
    actionId: `${actionType}:${targetId}`,
    actionType,
    evidence: ['evidence'],
    rationale: 'rationale',
    targetId,
    targetType: actionType === 'rebalance_load' ? 'person' : 'sprint',
  }
}

describe('resolveDialogOptions', () => {
  it('hydrates owner options from the visible people in the current graph state', () => {
    const options = resolveDialogOptions(
      makeState({
        rawPeople: [
          { id: 'person-1', name: 'Alex PM' },
          { id: 'person-2', name: 'Jordan Eng' },
        ],
      }),
      makeDraft('assign_owner', 'week-1')
    )

    expect(options).toEqual({
      person_id: [
        { label: 'Alex PM', value: 'person-1' },
        { label: 'Jordan Eng', value: 'person-2' },
      ],
    })
  })

  it('hydrates unassigned sprint issues and assignee options for assign_issues', () => {
    const options = resolveDialogOptions(
      makeState({
        rawPeople: [
          { id: 'person-1', name: 'Alex PM' },
          { id: 'person-2', name: 'Jordan Eng' },
        ],
        rawProjectCluster: {
          issues: [
            { assigneeId: undefined, id: 'issue-1', sprintId: 'week-1', state: 'todo', title: 'Fix login' },
            { assigneeId: 'person-1', id: 'issue-2', sprintId: 'week-1', state: 'todo', title: 'Wire alerts' },
            { assigneeId: undefined, id: 'issue-3', sprintId: 'week-2', state: 'todo', title: 'Refine backlog' },
            { assigneeId: undefined, id: 'issue-4', sprintId: 'week-1', state: 'done', title: 'Closed issue' },
          ],
          project: {
            id: 'project-1',
            status: 'active',
            title: 'Launch project',
          },
        },
      }),
      makeDraft('assign_issues', 'week-1')
    )

    expect(options).toEqual({
      issue_ids: [
        { label: 'Fix login', value: 'issue-1' },
      ],
      person_id: [
        { label: 'Alex PM', value: 'person-1' },
        { label: 'Jordan Eng', value: 'person-2' },
      ],
    })
  })

  it('hydrates reassignment choices for rebalance_load from the visible cluster', () => {
    const options = resolveDialogOptions(
      makeState({
        rawPeople: [
          { id: 'person-1', name: 'Casey PM' },
          { id: 'person-2', name: 'Jordan Eng' },
          { id: 'person-3', name: 'Riley Eng' },
        ],
        rawWeekCluster: {
          issues: [
            { assigneeId: 'person-1', id: 'issue-1', sprintId: 'week-1', state: 'todo', title: 'Fix login' },
            { assigneeId: 'person-1', id: 'issue-2', sprintId: 'week-1', state: 'closed', title: 'Closed issue' },
            { assigneeId: 'person-2', id: 'issue-3', sprintId: 'week-1', state: 'todo', title: 'Ship analytics' },
          ],
          week: {
            id: 'week-1',
            status: 'active',
            title: 'Week 1',
          },
        },
      }),
      makeDraft('rebalance_load', 'person-1')
    )

    expect(options).toEqual({
      issues: [
        { label: 'Fix login', value: 'issue-1' },
      ],
      people: [
        { label: 'Jordan Eng', value: 'person-2' },
        { label: 'Riley Eng', value: 'person-3' },
      ],
    })
  })

  it('prefers explicit dialog options when the draft already carries them', () => {
    const options = resolveDialogOptions(
      makeState({
        rawPeople: [
          { id: 'person-1', name: 'Alex PM' },
        ],
      }),
      {
        ...makeDraft('assign_owner', 'week-1'),
        contextHints: {
          dialogOptions: {
            person_id: [
              { label: 'Override', value: 'person-99' },
            ],
          },
        },
      }
    )

    expect(options).toEqual({
      person_id: [
        { label: 'Override', value: 'person-99' },
      ],
    })
  })
})
