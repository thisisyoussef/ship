import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureFirstPackActionsRegistered } from './definitions/index.js'
import { ActionExecutionService } from './execution-service.js'

describe('action execution service dialogs', () => {
  beforeEach(() => {
    ensureFirstPackActionsRegistered()
  })

  it('hydrates assign_owner from runtime options and patches the selected owner', async () => {
    const hydrateOptions = vi.fn(async () => ({
      ownerId: [
        { label: 'Jordan', value: 'person-2' },
      ],
    }))
    const shipRequest = vi.fn(async () => ({
      json: async () => ({ ok: true }),
      ok: true,
      status: 200,
    }))

    const service = new ActionExecutionService({
      hydrateOptions,
      shipRequest,
    })

    const draft = {
      actionId: 'assign_owner:week-1',
      actionType: 'assign_owner',
      evidence: ['Week 1 has no owner assigned.'],
      rationale: 'Assign an accountable owner before execution.',
      targetId: 'week-1',
      targetType: 'sprint',
    } as const

    const review = await service.review({
      actionId: draft.actionId,
      draft,
      workspaceId: 'workspace-1',
    })

    expect(hydrateOptions).toHaveBeenCalledWith(
      'assign_owner',
      'week-1',
      'workspace-1',
    )
    expect(review.dialogSpec.fields).toEqual([
      expect.objectContaining({
        label: 'Owner',
        name: 'ownerId',
        options: [
          { label: 'Jordan', value: 'person-2' },
        ],
        type: 'single_select',
      }),
    ])

    const result = await service.apply({
      actionId: draft.actionId,
      draft,
      submission: {
        actionId: draft.actionId,
        values: {
          ownerId: 'person-2',
        },
      },
      workspaceId: 'workspace-1',
    })

    expect(shipRequest).toHaveBeenCalledWith(
      'PATCH',
      '/api/documents/week-1',
      {
        properties: {
          owner_id: 'person-2',
        },
      },
    )
    expect(result.status).toBe('applied')
  })

  it('hydrates assign_issues from runtime options and fans out assignee updates', async () => {
    const hydrateOptions = vi.fn(async () => ({
      assigneeId: [
        { label: 'Jordan', value: 'person-2' },
      ],
      issueIds: [
        { label: 'FG-101', value: 'issue-1' },
        { label: 'FG-102', value: 'issue-2' },
      ],
    }))
    const shipRequest = vi.fn(async () => ({
      json: async () => ({ ok: true }),
      ok: true,
      status: 200,
    }))

    const service = new ActionExecutionService({
      hydrateOptions,
      shipRequest,
    })

    const draft = {
      actionId: 'assign_issues:week-1',
      actionType: 'assign_issues',
      evidence: ['Two sprint issues are still unassigned.'],
      rationale: 'Assign the work before the sprint slips.',
      targetId: 'week-1',
      targetType: 'sprint',
    } as const

    const review = await service.review({
      actionId: draft.actionId,
      draft,
      workspaceId: 'workspace-1',
    })

    expect(review.dialogSpec.fields).toEqual([
      expect.objectContaining({
        name: 'issueIds',
        options: [
          { label: 'FG-101', value: 'issue-1' },
          { label: 'FG-102', value: 'issue-2' },
        ],
        type: 'multi_select',
      }),
      expect.objectContaining({
        name: 'assigneeId',
        options: [
          { label: 'Jordan', value: 'person-2' },
        ],
        type: 'single_select',
      }),
    ])

    const result = await service.apply({
      actionId: draft.actionId,
      draft,
      submission: {
        actionId: draft.actionId,
        values: {
          assigneeId: 'person-2',
          issueIds: ['issue-1', 'issue-2'],
        },
      },
      workspaceId: 'workspace-1',
    })

    expect(shipRequest).toHaveBeenNthCalledWith(
      1,
      'PATCH',
      '/api/issues/issue-1',
      { assignee_ids: ['person-2'] },
    )
    expect(shipRequest).toHaveBeenNthCalledWith(
      2,
      'PATCH',
      '/api/issues/issue-2',
      { assignee_ids: ['person-2'] },
    )
    expect(result.status).toBe('applied')
  })
})
