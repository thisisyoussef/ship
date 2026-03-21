import { beforeEach, describe, expect, it, vi } from 'vitest'

const { interrupt } = vi.hoisted(() => ({
  interrupt: vi.fn(() => ({ decision: 'dismissed' })),
}))

vi.mock('@langchain/langgraph', () => ({
  interrupt,
}))

import { approvalInterrupt } from './approval-interrupt.js'
import { ensureFirstPackActionsRegistered } from '../../actions/definitions/index.js'
import type { FleetGraphActionDraft } from '../../actions/registry.js'
import type { FleetGraphStateV2 } from '../state-v2.js'

function makeBaseState(overrides: Partial<FleetGraphStateV2> = {}) {
  return {
    actionDrafts: [],
    normalizedContext: {
      adjacency: {
        'week-1': {
          assignees: [],
          children: ['issue-1', 'issue-2'],
          entityId: 'week-1',
          owner: undefined,
          parents: [],
          project: 'project-1',
        },
      },
      edges: [],
      nodes: [
        {
          data: {},
          id: 'week-1',
          title: 'Week 1',
          type: 'week',
        },
        {
          data: {
            sprintId: 'week-1',
          },
          id: 'issue-1',
          title: 'FG-101',
          type: 'issue',
        },
        {
          data: {
            assigneeId: 'person-1',
            sprintId: 'week-1',
          },
          id: 'issue-2',
          title: 'FG-102',
          type: 'issue',
        },
        {
          data: {},
          id: 'person-1',
          title: 'Alice',
          type: 'person',
        },
        {
          data: {},
          id: 'person-2',
          title: 'Jordan',
          type: 'person',
        },
      ],
      resolvedPersons: {
        'person-1': {
          id: 'person-1',
          name: 'Alice',
        },
        'person-2': {
          id: 'person-2',
          name: 'Jordan',
        },
      },
      temporal: {},
    },
    proposedActions: [],
    reasonedFindings: [],
    selectedActionId: null,
    traceMetadata: {
      mode: 'on_demand',
      runId: 'run-1',
      startedAt: '2026-03-21T12:00:00.000Z',
      triggerSource: 'document-page',
      triggerType: 'user_chat',
      workspaceId: 'workspace-1',
    },
    ...overrides,
  } as unknown as FleetGraphStateV2
}

function readInterruptPayload() {
  const calls = interrupt.mock.calls as unknown as Array<unknown[]>
  const payload = calls[0]?.[0]
  expect(payload).toBeDefined()
  if (!payload) {
    throw new Error('Expected approvalInterrupt to call interrupt().')
  }
  return payload as {
    dialogSpec: {
      fields: unknown[]
    }
  }
}

describe('approvalInterrupt', () => {
  beforeEach(() => {
    ensureFirstPackActionsRegistered()
    interrupt.mockClear()
  })

  it('hydrates assign_owner review options from normalized people', () => {
    const actionDraft: FleetGraphActionDraft = {
      actionId: 'assign_owner:week-1',
      actionType: 'assign_owner',
      contextHints: {
        findingFingerprint: 'finding-1',
      },
      evidence: ['Week 1 has no owner assigned.'],
      rationale: 'Assign an accountable owner before execution.',
      targetId: 'week-1',
      targetType: 'sprint',
    }

    const result = approvalInterrupt(makeBaseState({
      actionDrafts: [actionDraft],
      proposedActions: [
        {
          endpoint: {
            method: 'PATCH',
            path: '/api/documents/week-1',
          },
          findingFingerprint: 'finding-1',
          label: 'Assign owner',
          requiresApproval: true,
          rollbackFeasibility: 'easy',
          safetyRationale: 'Standard owner assignment.',
          targetEntity: {
            id: 'week-1',
            name: 'Week 1',
            type: 'sprint',
          },
        },
      ],
      reasonedFindings: [
        {
          evidence: ['Week 1 has no owner assigned.'],
          explanation: 'This week needs an accountable owner.',
          findingType: 'week_start_drift',
          fingerprint: 'finding-1',
          severity: 'warning',
          targetEntity: {
            id: 'week-1',
            name: 'Week 1',
            type: 'sprint',
          },
          title: 'Week needs an owner',
        },
      ],
      selectedActionId: actionDraft.actionId,
    }))

    const payload = readInterruptPayload()

    expect(payload.dialogSpec.fields).toEqual([
      expect.objectContaining({
        label: 'Owner',
        name: 'ownerId',
        options: [
          { label: 'Alice', value: 'person-1' },
          { label: 'Jordan', value: 'person-2' },
        ],
        type: 'single_select',
      }),
    ])
    expect(result.pendingApproval?.dialogSpec.fields).toEqual(payload.dialogSpec.fields)
    expect(result.approvalDecision).toBe('dismissed')
  })

  it('hydrates assign_issues review options from sprint issues and teammates', () => {
    const actionDraft: FleetGraphActionDraft = {
      actionId: 'assign_issues:week-1',
      actionType: 'assign_issues',
      contextHints: {
        findingFingerprint: 'finding-2',
      },
      evidence: ['Two sprint issues are still unassigned.'],
      rationale: 'Assign the work before the sprint slips.',
      targetId: 'week-1',
      targetType: 'sprint',
    }

    approvalInterrupt(makeBaseState({
      actionDrafts: [actionDraft],
      proposedActions: [
        {
          endpoint: {
            method: 'PATCH',
            path: '/api/documents/week-1',
          },
          findingFingerprint: 'finding-2',
          label: 'Assign issues',
          requiresApproval: true,
          rollbackFeasibility: 'easy',
          safetyRationale: 'Standard issue assignment.',
          targetEntity: {
            id: 'week-1',
            name: 'Week 1',
            type: 'sprint',
          },
        },
      ],
      reasonedFindings: [
        {
          evidence: ['Two sprint issues are still unassigned.'],
          explanation: 'Assign the work before the sprint slips.',
          findingType: 'week_start_drift',
          fingerprint: 'finding-2',
          severity: 'warning',
          targetEntity: {
            id: 'week-1',
            name: 'Week 1',
            type: 'sprint',
          },
          title: 'Week has unassigned work',
        },
      ],
      selectedActionId: actionDraft.actionId,
    }))

    const payload = readInterruptPayload()

    expect(payload.dialogSpec.fields).toEqual([
      expect.objectContaining({
        name: 'issueIds',
        options: [
          { label: 'FG-101', value: 'issue-1' },
        ],
        type: 'multi_select',
      }),
      expect.objectContaining({
        name: 'assigneeId',
        options: [
          { label: 'Alice', value: 'person-1' },
          { label: 'Jordan', value: 'person-2' },
        ],
        type: 'single_select',
      }),
    ])
  })
})
