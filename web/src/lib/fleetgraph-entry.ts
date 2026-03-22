import type { DocumentContext } from '@/hooks/useDocumentContextQuery'

export interface FleetGraphEntryDocument {
  documentType: string
  id: string
  planApprovalState?: string | null
  reviewState?: {
    content?: Record<string, unknown>
    isDraft: boolean
    planValidated?: boolean | null
    title?: string | null
  } | null
  title: string
  workspaceId?: string
}

export interface FleetGraphEntryInput {
  activeTab?: string
  context: DocumentContext
  document: FleetGraphEntryDocument
  nestedPath?: string
  userId: string
}

export interface FleetGraphApprovalOption {
  id: 'apply' | 'dismiss' | 'snooze'
  label: string
}

export interface FleetGraphApprovalEnvelope {
  body?: Record<string, unknown>
  endpoint: {
    method: 'DELETE' | 'PATCH' | 'POST'
    path: string
  }
  evidence: string[]
  options: FleetGraphApprovalOption[]
  rationale: string
  state: 'pending_confirmation'
  summary: string
  targetId: string
  targetType: 'document' | 'project' | 'sprint'
  title: string
  type: 'approve_project_plan' | 'approve_week_plan' | 'post_comment' | 'start_week' | 'validate_week_plan'
}

export interface FleetGraphEntryActionOutcome {
  message: string
  resultStatusCode?: number
  status: 'already_applied' | 'applied' | 'dismissed' | 'failed' | 'pending'
}

export interface FleetGraphEntryResponse {
  approval?: FleetGraphApprovalEnvelope
  entry: {
    current: {
      documentType: string
      id: string
      title: string
    }
    route: {
      activeTab?: string
      nestedPath: string[]
      surface: string
    }
    threadId: string
  }
  run: {
    branch: string
    outcome: 'advisory' | 'approval_required' | 'fallback' | 'quiet'
    path: string[]
    routeSurface: string
    threadId: string
  }
  summary: {
    detail: string
    surfaceLabel: string
    title: string
  }
}

export interface FleetGraphEntryApplyResponse {
  actionOutcome: FleetGraphEntryActionOutcome
  run: FleetGraphEntryResponse['run']
  summary: FleetGraphEntryResponse['summary']
}

function splitNestedPath(value?: string) {
  return value ? value.split('/').filter(Boolean) : []
}

function findRelatedContextTarget(
  context: DocumentContext,
  type: 'project' | 'sprint'
) {
  return context.belongs_to.find((item) => item.type === type)
}

function hasApprovedPlan(document: FleetGraphEntryDocument) {
  return document.planApprovalState === 'approved'
}

function hasValidatedPlan(document: FleetGraphEntryDocument) {
  return document.reviewState?.planValidated === true
}

function buildRequestedAction(
  document: FleetGraphEntryDocument,
  context: DocumentContext,
  activeTab?: string
) {
  if (document.documentType === 'project') {
    if (hasApprovedPlan(document)) {
      return undefined
    }

    return {
      endpoint: {
        method: 'POST' as const,
        path: `/api/projects/${document.id}/approve-plan`,
      },
      evidence: [
        'You are already on the project page, so you can review the plan in context.',
        'Approving it marks this plan as ready for the team to follow.',
      ],
      rationale: 'Approve this plan when it is ready to guide the project.',
      summary: 'Approve the current project plan.',
      targetId: document.id,
      targetType: 'project' as const,
      title: 'Approve project plan',
      type: 'approve_project_plan' as const,
    }
  }

  if (document.documentType === 'sprint') {
    if (activeTab === 'review') {
      if (!document.reviewState || hasValidatedPlan(document)) {
        return undefined
      }

      return {
        body: document.reviewState.isDraft
          ? {
            content: document.reviewState.content,
            plan_validated: true,
            title: document.reviewState.title ?? undefined,
          }
          : {
            plan_validated: true,
          },
        endpoint: {
          method: document.reviewState.isDraft ? 'POST' as const : 'PATCH' as const,
          path: `/api/weeks/${document.id}/review`,
        },
        evidence: [
          'You are already on the week review, so the validation result is visible on this page.',
          'Marking the plan as validated updates Plan Validation to show Validated.',
        ],
        rationale: 'Validate the week plan when the review shows the plan held up in practice.',
        summary: 'Mark the current week plan as validated in the review.',
        targetId: document.id,
        targetType: 'sprint' as const,
        title: 'Validate week plan',
        type: 'validate_week_plan' as const,
      }
    }

    if (hasApprovedPlan(document)) {
      return undefined
    }
    return undefined
  }

  if (document.documentType === 'weekly_plan') {
    if (hasApprovedPlan(document)) {
      return undefined
    }

    const relatedSprint = findRelatedContextTarget(context, 'sprint')

    if (relatedSprint) {
      return {
        endpoint: {
          method: 'POST' as const,
          path: `/api/weeks/${relatedSprint.id}/approve-plan`,
        },
        evidence: [
          relatedSprint.title
            ? `This weekly plan belongs to ${relatedSprint.title}.`
            : 'This weekly plan belongs to the current sprint context.',
          'Approving it signals that the team can move forward with this week.',
        ],
        rationale: 'Approve this week plan when the team is ready to move forward.',
        summary: 'Approve the current week plan.',
        targetId: relatedSprint.id,
        targetType: 'sprint' as const,
        title: 'Approve week plan',
        type: 'approve_week_plan' as const,
      }
    }
  }

  return {
    endpoint: {
      method: 'POST' as const,
      path: `/api/documents/${document.id}/comments`,
    },
    evidence: [
      'The comment would be posted directly on this document.',
      'A quick review helps make sure the message is right before it goes out.',
    ],
    rationale: 'Review the comment before posting it to the team.',
    summary: 'Post a comment on the current document.',
    targetId: document.id,
    targetType: 'document' as const,
    title: 'Post comment',
    type: 'post_comment' as const,
  }
}

export function buildFleetGraphEntryPayload(
  input: FleetGraphEntryInput,
  previewApproval = false
) {
  if (!input.document.workspaceId) {
    throw new Error('FleetGraph needs a workspace id from the current document.')
  }

  const requestedAction = previewApproval
    ? buildRequestedAction(input.document, input.context, input.activeTab)
    : undefined

  return {
    context: input.context,
    draft: requestedAction
      ? { requestedAction }
      : undefined,
    route: {
      activeTab: input.activeTab,
      nestedPath: splitNestedPath(input.nestedPath),
      surface: 'document-page',
    },
    trigger: {
      actorId: input.userId,
      documentId: input.document.id,
      documentType: input.document.documentType,
      mode: 'on_demand',
      trigger: 'document-context',
      workspaceId: input.document.workspaceId,
    },
  }
}
