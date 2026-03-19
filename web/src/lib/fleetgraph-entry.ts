import type { DocumentContext } from '@/hooks/useDocumentContextQuery'

export type FleetGraphActionType =
  | 'approve_project_plan'
  | 'approve_week_plan'
  | 'assign_issues'
  | 'assign_owner'
  | 'escalate_risk'
  | 'post_comment'
  | 'post_standup'
  | 'rebalance_load'
  | 'start_week'

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

export interface FleetGraphDialogSelectOption {
  description?: string
  disabled?: boolean
  label: string
  value: string
}

export type FleetGraphDialogField =
  | {
      name: string
      type: 'hidden'
      value: string
    }
  | {
      label: string
      name: string
      options: FleetGraphDialogSelectOption[]
      placeholder?: string
      required?: boolean
      type: 'single_select'
    }
  | {
      label: string
      maxItems?: number
      minItems?: number
      name: string
      options: FleetGraphDialogSelectOption[]
      placeholder?: string
      required?: boolean
      type: 'multi_select'
    }
  | {
      label: string
      maxLength?: number
      minLength?: number
      name: string
      placeholder?: string
      required?: boolean
      type: 'text_input'
    }
  | {
      label: string
      maxLength?: number
      minLength?: number
      name: string
      placeholder?: string
      required?: boolean
      rows?: number
      type: 'textarea'
    }

export interface FleetGraphDialogSpec {
  cancelLabel: string
  confirmLabel: string
  evidence: string[]
  fields: FleetGraphDialogField[]
  kind: 'composite' | 'confirm' | 'multi_select' | 'single_select' | 'text_input' | 'textarea'
  summary: string
  title: string
}

export interface FleetGraphActionDraft {
  actionId: string
  actionType: FleetGraphActionType
  contextHints?: Record<string, unknown>
  evidence: string[]
  rationale: string
  targetId: string
  targetType: 'document' | 'issue' | 'person' | 'project' | 'sprint'
}

export interface FleetGraphReasonedFinding {
  affectedPerson?: {
    id: string
    name: string
  }
  deadline?: string
  evidence: string[]
  explanation: string
  findingType: string
  fingerprint: string
  severity: 'critical' | 'info' | 'warning'
  targetEntity: {
    id: string
    name: string
    type: string
  }
  title: string
}

export interface FleetGraphPendingApproval {
  actionDraft?: FleetGraphActionDraft | null
  dialogSpec?: FleetGraphDialogSpec | null
  id?: string
  summary?: string
  title?: string
  validationError?: string
}

export interface FleetGraphChatAnswer {
  entityLinks: Array<{ id: string; name: string; type: string }>
  relatedContextSummary?: string
  suggestedNextSteps: string[]
  text: string
}

export type FleetGraphResponsePayload =
  | { type: 'chat_answer'; answer: FleetGraphChatAnswer }
  | { type: 'degraded'; disclaimer: string; partialAnswer?: FleetGraphChatAnswer }
  | { type: 'empty' }
  | {
      type: 'insight_cards'
      cards: Array<{
        actionButtons: Array<{
          action: 'apply' | 'dismiss' | 'snooze' | 'view_evidence'
          label: string
          requiresApproval?: boolean
        }>
        body: string
        findingFingerprint: string
        id: string
        severityBadge: 'critical' | 'info' | 'warning'
        targetPerson?: { id: string; name: string }
        title: string
      }>
    }

export interface FleetGraphThreadResponse {
  actionDrafts: FleetGraphActionDraft[]
  branch: 'action_required' | 'advisory' | 'fallback' | 'quiet'
  contextSummary?: string | null
  path: string[]
  pendingApproval?: FleetGraphPendingApproval | null
  reasonedFindings: FleetGraphReasonedFinding[]
  responsePayload: FleetGraphResponsePayload
  threadId: string
  turnCount?: number
}

export interface FleetGraphEntryResponse extends FleetGraphThreadResponse {
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
}

function splitNestedPath(value?: string) {
  return value ? value.split('/').filter(Boolean) : []
}

export function buildFleetGraphEntryPayload(
  input: FleetGraphEntryInput
) {
  if (!input.document.workspaceId) {
    throw new Error('FleetGraph needs a workspace id from the current document.')
  }

  return {
    context: input.context,
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
