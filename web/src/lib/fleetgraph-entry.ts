import type { DocumentContext } from '@/hooks/useDocumentContextQuery'

export interface FleetGraphEntryDocument {
  documentType: string
  id: string
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
  type: 'approve_project_plan' | 'approve_week_plan' | 'post_comment' | 'start_week'
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

function splitNestedPath(value?: string) {
  return value ? value.split('/').filter(Boolean) : []
}

function buildRequestedAction(document: FleetGraphEntryDocument) {
  if (document.documentType === 'project') {
    return {
      endpoint: {
        method: 'POST' as const,
        path: `/api/projects/${document.id}/approve-plan`,
      },
      evidence: [
        'Project plan approval changes persistent project state.',
        'Project context is available on the current Ship page.',
      ],
      rationale: 'Approving a project plan is a consequential Ship write.',
      summary: 'Approve the current project plan.',
      targetId: document.id,
      targetType: 'project' as const,
      title: 'Approve project plan',
      type: 'approve_project_plan' as const,
    }
  }

  if (document.documentType === 'sprint') {
    return {
      endpoint: {
        method: 'POST' as const,
        path: `/api/weeks/${document.id}/approve-plan`,
      },
      evidence: [
        'Week plan approval changes persistent sprint approval state.',
        'FleetGraph is operating from the current week context.',
      ],
      rationale: 'Week approval is a consequential Ship write.',
      summary: 'Approve the current week plan.',
      targetId: document.id,
      targetType: 'sprint' as const,
      title: 'Approve week plan',
      type: 'approve_week_plan' as const,
    }
  }

  return {
    endpoint: {
      method: 'POST' as const,
      path: `/api/documents/${document.id}/comments`,
    },
    evidence: [
      'Posting a persistent comment creates durable workspace state.',
      'The current document context is already loaded in Ship.',
    ],
    rationale: 'Persistent comments should pass through human review first.',
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

  return {
    context: input.context,
    draft: previewApproval
      ? { requestedAction: buildRequestedAction(input.document) }
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
