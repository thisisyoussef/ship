import {
  buildEmptyDialogSubmission,
} from './drafts.js'
import type { FleetGraphV2Runtime } from '../graph/index.js'
import type { FleetGraphStateV2 } from '../graph/state-v2.js'
import type {
  FleetGraphActionDraft,
  FleetGraphDialogSubmission,
} from './registry.js'

interface ReviewThreadActionInput {
  actionId: string
  threadId: string
  workspaceId: string
}

interface ApplyThreadActionInput extends ReviewThreadActionInput {
  submission?: FleetGraphDialogSubmission['values']
}

interface FleetGraphOnDemandActionServiceDeps {
  runtime: FleetGraphV2Runtime
}

export class FleetGraphOnDemandActionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message)
    this.name = 'FleetGraphOnDemandActionError'
  }
}

function buildReviewThreadId(
  threadId: string,
  actionId: string
) {
  return `${threadId}:action:${actionId}`
}

function ensureWorkspace(state: FleetGraphStateV2, workspaceId: string) {
  if (state.workspaceId !== workspaceId) {
    throw new FleetGraphOnDemandActionError(
      'FleetGraph thread does not belong to the authenticated workspace.',
      403
    )
  }
}

function readActionDraft(
  state: FleetGraphStateV2,
  actionId: string
) {
  const actionDraft = state.actionDrafts.find((draft) => draft.actionId === actionId)
  if (!actionDraft) {
    throw new FleetGraphOnDemandActionError(
      'FleetGraph could not find that action on the current analysis thread.',
      404
    )
  }
  return actionDraft
}

function readPendingApproval(
  interrupts: Awaited<ReturnType<FleetGraphV2Runtime['getPendingInterrupts']>>
) {
  const approvalInterrupt = interrupts.find((item) =>
    item.taskName === 'approval_interrupt'
    && item.value
    && typeof item.value === 'object'
    && (item.value as { type?: string }).type === 'approval_request'
  )

  if (!approvalInterrupt?.value || typeof approvalInterrupt.value !== 'object') {
    throw new FleetGraphOnDemandActionError(
      'FleetGraph could not prepare a review payload for this action.',
      500
    )
  }

  return approvalInterrupt.value as {
    actionDraft: FleetGraphActionDraft
    dialogSpec: {
      cancelLabel: string
      confirmLabel: string
      evidence: string[]
      fields: unknown[]
      kind: string
      summary: string
      title: string
    }
    id: string
    validationError?: string
  }
}

async function loadAnalysisState(
  runtime: FleetGraphV2Runtime,
  input: ReviewThreadActionInput
) {
  const snapshot = await runtime.getState(input.threadId)
  const state = snapshot.values
  ensureWorkspace(state, input.workspaceId)
  const actionDraft = readActionDraft(state, input.actionId)

  return { actionDraft, state }
}

function buildReviewInvokeInput(
  state: FleetGraphStateV2,
  actionId: string,
  reviewThreadId: string
) {
  return {
    activeTab: state.activeTab,
    actorId: state.actorId,
    dirtyCoalescedIds: [],
    dirtyEntityId: null,
    dirtyEntityType: null,
    dirtyWriteType: null,
    documentId: state.documentId,
    documentType: state.documentType,
    mode: 'on_demand' as const,
    nestedPath: state.nestedPath,
    projectContextId: state.projectContextId,
    selectedActionId: actionId,
    threadId: reviewThreadId,
    triggerSource: 'human-review',
    triggerType: 'user_chat' as const,
    userQuestion: null,
    viewerUserId: state.viewerUserId,
    workspaceId: state.workspaceId,
  }
}

async function ensureReviewThread(
  runtime: FleetGraphV2Runtime,
  input: ReviewThreadActionInput,
  state: FleetGraphStateV2
) {
  const reviewThreadId = buildReviewThreadId(input.threadId, input.actionId)
  const pendingInterrupts = await runtime.getPendingInterrupts(reviewThreadId)
    .catch(() => [])
  if (pendingInterrupts.length > 0) {
    return reviewThreadId
  }

  const existingState = await runtime.getState(reviewThreadId)
    .then((snapshot) => snapshot.values)
    .catch(() => null)
  if (existingState?.actionResult || existingState?.approvalDecision) {
    return reviewThreadId
  }

  await runtime.invoke(
    buildReviewInvokeInput(state, input.actionId, reviewThreadId),
    { threadId: reviewThreadId }
  )

  return reviewThreadId
}

export function createFleetGraphOnDemandActionService(
  deps: FleetGraphOnDemandActionServiceDeps
) {
  const runtime = deps.runtime

  return {
    async applyThreadAction(input: ApplyThreadActionInput) {
      const { actionDraft, state } = await loadAnalysisState(runtime, input)
      const reviewThreadId = await ensureReviewThread(runtime, input, state)
      const reviewState = await runtime.getState(reviewThreadId)

      if (reviewState.values.actionResult && reviewState.values.approvalDecision === 'approved') {
        return {
          actionDraft,
          approvalDecision: reviewState.values.approvalDecision,
          responsePayload: reviewState.values.responsePayload,
          threadId: reviewThreadId,
          actionResult: reviewState.values.actionResult,
        }
      }

      const submission = input.submission
        ? {
            actionId: actionDraft.actionId,
            values: input.submission,
          }
        : buildEmptyDialogSubmission(actionDraft.actionId)

      const resumedState = await runtime.resume(reviewThreadId, {
        actionId: actionDraft.actionId,
        decision: 'approved',
        dialogSubmission: submission,
      })

      if (!resumedState.actionResult) {
        throw new FleetGraphOnDemandActionError(
          'FleetGraph could not resolve the action outcome for this review thread.',
          500
        )
      }

      return {
        actionDraft,
        actionResult: resumedState.actionResult,
        approvalDecision: resumedState.approvalDecision,
        responsePayload: resumedState.responsePayload,
        threadId: reviewThreadId,
      }
    },

    async reviewThreadAction(input: ReviewThreadActionInput) {
      const { actionDraft, state } = await loadAnalysisState(runtime, input)
      const reviewThreadId = await ensureReviewThread(runtime, input, state)
      const pendingApproval = readPendingApproval(
        await runtime.getPendingInterrupts(reviewThreadId)
      )

      return {
        actionDraft,
        dialogSpec: pendingApproval.dialogSpec,
        threadId: reviewThreadId,
        validationError: pendingApproval.validationError,
      }
    },
  }
}
