import { describe, expect, it } from 'vitest'

import type {
  FleetGraphDialogSpec,
  FleetGraphDialogSubmission,
} from '../registry.js'
import { rebalanceLoadDefinition } from './rebalance-load.js'

const dialogSpec: FleetGraphDialogSpec = {
  cancelLabel: 'Cancel',
  confirmLabel: 'Reassign',
  evidence: ['evidence'],
  fields: [
    {
      label: 'Issues to reassign',
      minItems: 1,
      name: 'issue_ids',
      options: [
        { label: 'Issue 1', value: 'issue-1' },
        { label: 'Issue 2', value: 'issue-2' },
      ],
      required: true,
      type: 'multi_select',
    },
    {
      label: 'Reassign to',
      name: 'new_assignee_id',
      options: [
        { label: 'Jordan', value: 'person-1' },
        { label: 'Riley', value: 'person-2' },
      ],
      required: true,
      type: 'single_select',
    },
  ],
  kind: 'composite',
  summary: 'summary',
  title: 'title',
}

function makeSubmission(
  values: FleetGraphDialogSubmission['values']
): FleetGraphDialogSubmission {
  return {
    actionId: 'rebalance_load:person-1',
    values,
  }
}

describe('rebalanceLoadDefinition.validateSubmission', () => {
  it('rejects issue ids that were not present in the dialog options', () => {
    expect(
      rebalanceLoadDefinition.validateSubmission(
        makeSubmission({
          issue_ids: ['issue-3'],
          new_assignee_id: 'person-1',
        }),
        dialogSpec
      )
    ).toEqual({
      error: 'Invalid issue selection',
      valid: false,
    })
  })

  it('rejects new assignee ids that were not present in the dialog options', () => {
    expect(
      rebalanceLoadDefinition.validateSubmission(
        makeSubmission({
          issue_ids: ['issue-1'],
          new_assignee_id: 'person-9',
        }),
        dialogSpec
      )
    ).toEqual({
      error: 'Invalid person selection',
      valid: false,
    })
  })

  it('accepts submissions that match the reviewed options', () => {
    expect(
      rebalanceLoadDefinition.validateSubmission(
        makeSubmission({
          issue_ids: ['issue-1', 'issue-2'],
          new_assignee_id: 'person-2',
        }),
        dialogSpec
      )
    ).toEqual({
      valid: true,
    })
  })
})
