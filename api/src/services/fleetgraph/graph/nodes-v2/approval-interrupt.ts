import { interrupt } from '@langchain/langgraph'

import { buildEmptyDialogSubmission } from '../../actions/drafts.js'
import {
  getActionDefinition,
  type FleetGraphSelectOption,
} from '../../actions/registry.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'
import type {
  FleetGraphDialogSpec,
  FleetGraphV2ResumeInput,
  PendingApproval,
  TraceMetadata,
} from '../types-v2.js'
import { parseFleetGraphV2ResumeInput } from '../types-v2.js'

function readDialogOptions(draft: PendingApproval['actionDraft']) {
  const rawOptions = draft.contextHints?.dialogOptions
  if (!rawOptions || typeof rawOptions !== 'object') {
    return {}
  }
  return rawOptions as Record<string, FleetGraphSelectOption[]>
}

function buildPendingApproval(state: FleetGraphStateV2): PendingApproval | null {
  const actionDraft = state.selectedActionId
    ? state.actionDrafts.find((draft) => draft.actionId === state.selectedActionId)
    : state.actionDrafts[0]
  if (!actionDraft) {
    return null
  }

  const definition = getActionDefinition(actionDraft.actionType)
  if (!definition) {
    return null
  }

  const findingFingerprint = typeof actionDraft.contextHints?.findingFingerprint === 'string'
    ? actionDraft.contextHints.findingFingerprint
    : undefined
  const reasonedFinding = state.reasonedFindings?.find((finding) =>
    finding.fingerprint === findingFingerprint
  )
  if (!reasonedFinding) {
    return null
  }

  const proposedAction = state.proposedActions.find((action) =>
    action.findingFingerprint === reasonedFinding.fingerprint
  )
  if (!proposedAction) {
    return null
  }

  return {
    actionDraft,
    createdAt: new Date().toISOString(),
    dialogSpec: definition.buildDialogSpec(actionDraft, readDialogOptions(actionDraft)),
    id: `approval:${reasonedFinding.fingerprint}:${actionDraft.actionId}`,
    proposedAction,
    reasonedFinding,
  }
}

function interruptPayload(
  pendingApproval: PendingApproval
) {
  return {
    actionDraft: pendingApproval.actionDraft,
    dialogSpec: pendingApproval.dialogSpec,
    id: pendingApproval.id,
    options: {
      apply: { label: pendingApproval.dialogSpec.confirmLabel },
      dismiss: { label: 'Dismiss' },
      snooze: { label: 'Snooze' },
    },
    summary: pendingApproval.reasonedFinding.explanation,
    title: pendingApproval.reasonedFinding.title,
    type: 'approval_request',
  }
}

function validateResumeInput(
  pendingApproval: PendingApproval,
  resumeInput: FleetGraphV2ResumeInput
): { error?: string; normalizedSubmission?: FleetGraphV2ResumeInput['dialogSubmission'] } {
  if (resumeInput.actionId && resumeInput.actionId !== pendingApproval.actionDraft.actionId) {
    return { error: 'That action does not match the pending FleetGraph review.' }
  }

  if (resumeInput.decision !== 'approved') {
    return {}
  }

  const definition = getActionDefinition(pendingApproval.actionDraft.actionType)
  if (!definition) {
    return { error: 'FleetGraph could not resolve that action definition.' }
  }

  const normalizedSubmission = resumeInput.dialogSubmission
    ?? buildEmptyDialogSubmission(pendingApproval.actionDraft.actionId)
  const validation = definition.validateSubmission(
    normalizedSubmission,
    pendingApproval.dialogSpec
  )

  return validation.valid
    ? { normalizedSubmission }
    : { error: validation.error }
}

export function approvalInterrupt(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  const pendingApproval = buildPendingApproval(state)
  if (!pendingApproval) {
    return {
      branch: 'fallback',
      fallbackReason: 'No reviewable FleetGraph action was available for approval.',
      path: ['approval_interrupt'],
    }
  }

  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    approvalRequired: true,
    branch: 'action_required',
  }

  let resumeValue = interrupt(interruptPayload(pendingApproval)) as unknown
  while (true) {
    try {
      const resumeInput = parseFleetGraphV2ResumeInput(resumeValue)
      const validation = validateResumeInput(pendingApproval, resumeInput)
      if (!validation.error) {
        return {
          approvalDecision: resumeInput.decision,
          dialogSubmission: validation.normalizedSubmission ?? null,
          path: ['approval_interrupt'],
          pendingApproval,
          traceMetadata,
        }
      }

      resumeValue = interrupt({
        ...interruptPayload(pendingApproval),
        validationError: validation.error,
      })
    } catch (error) {
      resumeValue = interrupt({
        ...interruptPayload(pendingApproval),
        validationError: error instanceof Error
          ? error.message
          : 'Invalid FleetGraph action submission.',
      })
    }
  }
}

export type ApprovalInterruptRoute =
  | 'execute_confirmed_action'
  | 'persist_action_outcome'

export function routeFromApprovalInterrupt(
  state: FleetGraphStateV2
): ApprovalInterruptRoute {
  return state.approvalDecision === 'approved'
    ? 'execute_confirmed_action'
    : 'persist_action_outcome'
}
