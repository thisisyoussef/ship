import { describe, expect, it } from 'vitest'

import type { DocumentContext } from '@/hooks/useDocumentContextQuery'
import { buildFleetGraphEntryPayload } from './fleetgraph-entry'

const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222'
const USER_ID = '11111111-1111-4111-8111-111111111111'
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333'
const PROJECT_ID = '44444444-4444-4444-8444-444444444444'
const SPRINT_ID = '55555555-5555-4555-8555-555555555555'

function createContext(currentDocumentType: string): DocumentContext {
  return {
    ancestors: [],
    belongs_to: [
      {
        color: '#1d4ed8',
        document_type: 'project',
        id: PROJECT_ID,
        title: 'North Star',
        type: 'project',
      },
      {
        document_type: 'sprint',
        id: SPRINT_ID,
        title: 'Sprint 8',
        type: 'sprint',
      },
    ],
    breadcrumbs: [
      {
        id: PROJECT_ID,
        title: 'North Star',
        type: 'project',
      },
      {
        id: SPRINT_ID,
        title: 'Sprint 8',
        type: 'sprint',
      },
      {
        id: DOCUMENT_ID,
        title: 'Current page',
        type: currentDocumentType,
      },
    ],
    children: [],
    current: {
      document_type: currentDocumentType,
      id: DOCUMENT_ID,
      title: 'Current page',
    },
  }
}

describe('buildFleetGraphEntryPayload', () => {
  it('maps sprint review pages to the week-validation action', () => {
    const payload = buildFleetGraphEntryPayload({
      activeTab: 'review',
      context: createContext('sprint'),
      document: {
        documentType: 'sprint',
        id: DOCUMENT_ID,
        reviewState: {
          content: {
            content: [{ type: 'paragraph' }],
            type: 'doc',
          },
          isDraft: true,
          planValidated: null,
          title: 'Week 8 Review',
        },
        title: 'Sprint 8',
        workspaceId: WORKSPACE_ID,
      },
      userId: USER_ID,
    }, true)

    expect(payload.draft?.requestedAction).toMatchObject({
      body: {
        content: {
          content: [{ type: 'paragraph' }],
          type: 'doc',
        },
        plan_validated: true,
        title: 'Week 8 Review',
      },
      endpoint: {
        method: 'POST',
        path: `/api/weeks/${DOCUMENT_ID}/review`,
      },
      summary: 'Mark the current week plan as validated in the review.',
      targetId: DOCUMENT_ID,
      targetType: 'sprint',
      title: 'Validate week plan',
      type: 'validate_week_plan',
      rationale: 'Validate the week plan when the review shows the plan held up in practice.',
    })
    expect(payload.draft?.requestedAction?.evidence).toContain(
      'Marking the plan as validated updates Plan Validation to show Validated.'
    )
  })

  it('maps weekly plan pages to the related week approval action', () => {
    const payload = buildFleetGraphEntryPayload({
      context: createContext('weekly_plan'),
      document: {
        documentType: 'weekly_plan',
        id: DOCUMENT_ID,
        title: 'Alice plan',
        workspaceId: WORKSPACE_ID,
      },
      userId: USER_ID,
    }, true)

    expect(payload.draft?.requestedAction).toMatchObject({
      endpoint: {
        method: 'POST',
        path: `/api/weeks/${SPRINT_ID}/approve-plan`,
      },
      summary: 'Approve the current week plan.',
      targetId: SPRINT_ID,
      targetType: 'sprint',
      title: 'Approve week plan',
      type: 'approve_week_plan',
      rationale: 'Approve this week plan when the team is ready to move forward.',
    })
    expect(payload.draft?.requestedAction?.evidence).toContain(
      'Approving it signals that the team can move forward with this week.'
    )
  })

  it('accepts nullable belongs_to color metadata from live document context payloads', () => {
    const context = createContext('weekly_plan')
    context.belongs_to[0] = {
      ...context.belongs_to[0],
      color: null,
    }

    const payload = buildFleetGraphEntryPayload({
      context,
      document: {
        documentType: 'weekly_plan',
        id: DOCUMENT_ID,
        title: 'Alice plan',
        workspaceId: WORKSPACE_ID,
      },
      userId: USER_ID,
    }, true)

    expect(payload.context.belongs_to[0]).toMatchObject({
      color: null,
      id: PROJECT_ID,
      type: 'project',
    })
    expect(payload.draft?.requestedAction?.type).toBe('approve_week_plan')
  })

  it('does not create a validation action when the sprint review already shows the plan as validated', () => {
    const payload = buildFleetGraphEntryPayload({
      activeTab: 'review',
      context: createContext('sprint'),
      document: {
        documentType: 'sprint',
        id: DOCUMENT_ID,
        reviewState: {
          isDraft: false,
          planValidated: true,
        },
        title: 'Sprint 8',
        workspaceId: WORKSPACE_ID,
      },
      userId: USER_ID,
    }, true)

    expect(payload.draft).toBeUndefined()
  })

  it('does not create a guided action from the sprint overview tab alone', () => {
    const payload = buildFleetGraphEntryPayload({
      activeTab: 'overview',
      context: createContext('sprint'),
      document: {
        documentType: 'sprint',
        id: DOCUMENT_ID,
        title: 'Sprint 8',
        workspaceId: WORKSPACE_ID,
      },
      userId: USER_ID,
    }, true)

    expect(payload.draft).toBeUndefined()
  })

  it('does not create a fallback preview action for unsupported weekly retro pages', () => {
    const payload = buildFleetGraphEntryPayload({
      context: createContext('weekly_retro'),
      document: {
        documentType: 'weekly_retro',
        id: DOCUMENT_ID,
        title: 'Alice retro',
        workspaceId: WORKSPACE_ID,
      },
      userId: USER_ID,
    }, true)

    expect(payload.draft).toBeUndefined()
  })
})
