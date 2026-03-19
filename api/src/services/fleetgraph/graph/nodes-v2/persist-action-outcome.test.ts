import { describe, expect, it } from 'vitest'

import { persistActionOutcome } from './persist-action-outcome.js'
import type { FleetGraphStateV2 } from '../state-v2.js'

function makeState() {
  return {
    actionResult: {
      endpoint: 'POST /api/weeks/week-1/start',
      executedAt: '2026-03-19T10:00:00.000Z',
      method: 'POST',
      path: '/api/weeks/week-1/start',
      responseBody: {
        snapshot_issue_count: 3,
      },
      statusCode: 200,
      success: true,
    },
    approvalDecision: 'approved',
    mode: 'on_demand',
    path: [],
    pendingApproval: {
      actionDraft: {
        actionId: 'start_week:week-1',
        actionType: 'start_week',
        evidence: ['status: planning'],
        rationale: 'The week should be active by now.',
        targetId: 'week-1',
        targetType: 'sprint',
      },
      createdAt: '2026-03-19T10:00:00.000Z',
      dialogSpec: {
        cancelLabel: 'Cancel',
        confirmLabel: 'Start week',
        evidence: ['status: planning'],
        fields: [],
        kind: 'confirm',
        summary: 'Ship still shows this week as planning. If you confirm, FleetGraph will try to start it in Ship.',
        title: 'Start this week in Ship?',
      },
      id: 'approval-1',
      proposedAction: {
        endpoint: {
          method: 'POST',
          path: '/api/weeks/week-1/start',
        },
        findingFingerprint: 'finding-1',
        label: 'Start week',
        requiresApproval: true,
        rollbackFeasibility: 'moderate',
        safetyRationale: 'Requires human approval.',
        targetEntity: {
          id: 'week-1',
          name: 'Week 1',
          type: 'sprint',
        },
      },
      reasonedFinding: {
        evidence: ['status: planning'],
        explanation: 'The week should be active by now.',
        findingType: 'week_start_drift',
        fingerprint: 'finding-1',
        severity: 'warning',
        targetEntity: {
          id: 'week-1',
          name: 'Week 1',
          type: 'sprint',
        },
        title: 'Week start drift',
      },
    },
    traceMetadata: {},
  } as unknown as FleetGraphStateV2
}

describe('persistActionOutcome', () => {
  it('returns human-readable success copy for start-week actions', async () => {
    const result = await persistActionOutcome(makeState())

    expect(result.responsePayload).toMatchObject({
      answer: {
        text: 'Week "Week 1" is now active in Ship with 3 scoped issues ready to track.',
      },
      type: 'chat_answer',
    })
  })
})
