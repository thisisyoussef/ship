import type { Request } from 'express'

import {
  buildShipRestRequestContext,
} from './executor.js'
import {
  buildOnDemandActionReview,
  buildOnDemandActionReviewThreadId,
  type FleetGraphOnDemandActionDraft,
  type FleetGraphOnDemandActionReview,
  sanitizeOnDemandActionDraft,
  toFleetGraphRequestedAction,
} from '../graph/on-demand-actions.js'
import {
  FleetGraphStateSchema,
  type FleetGraphActionOutcomeStatus,
  type FleetGraphAnalysisFinding,
  type FleetGraphState,
} from '../graph/types.js'
import {
  createFleetGraphRuntime,
  type FleetGraphRuntime,
} from '../graph/index.js'

type ReviewableState = FleetGraphState & {
  actionOutcome?: {
    message: string
    resultStatusCode?: number
    status: FleetGraphActionOutcomeStatus
  }
  analysisFindings?: FleetGraphAnalysisFinding[]
}

interface ReviewThreadActionInput {
  actionId: string
  threadId: string
  workspaceId: string
}

interface ApplyThreadActionInput extends ReviewThreadActionInput {
  request: Pick<Request, 'get' | 'header' | 'protocol'>
}

interface FleetGraphOnDemandActionServiceDeps {
  runtime?: FleetGraphRuntime
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

function parseReviewableState(values: unknown): ReviewableState {
  return FleetGraphStateSchema.parse(values) as ReviewableState
}

function readActionFromState(
  state: ReviewableState,
  actionId: string
): FleetGraphOnDemandActionDraft | undefined {
  const findings = Array.isArray(state.analysisFindings)
    ? state.analysisFindings
    : []

  return findings
    .map((finding) => sanitizeOnDemandActionDraft({
      ...finding.proposedAction,
      evidence: finding.evidence,
    }))
    .find((action) => action?.actionId === actionId)
}

async function loadAnalysisState(
  runtime: FleetGraphRuntime,
  input: ReviewThreadActionInput
) {
  const snapshot = await runtime.getState(input.threadId)
  const state = parseReviewableState(snapshot.values)

  if (state.workspaceId !== input.workspaceId) {
    throw new FleetGraphOnDemandActionError(
      'FleetGraph thread does not belong to the authenticated workspace.',
      403
    )
  }

  const action = readActionFromState(state, input.actionId)
  if (!action) {
    throw new FleetGraphOnDemandActionError(
      'FleetGraph could not find that action on the current analysis thread.',
      404
    )
  }

  return { action, state }
}

async function ensureReviewThread(
  runtime: FleetGraphRuntime,
  input: ReviewThreadActionInput,
  action: FleetGraphOnDemandActionDraft,
  state: ReviewableState
) {
  const reviewThreadId = buildOnDemandActionReviewThreadId(input.threadId, action.actionId)
  const pendingInterrupts = await runtime.getPendingInterrupts(reviewThreadId)
    .catch(() => [])

  if (pendingInterrupts.length > 0) {
    return reviewThreadId
  }

  const existingReview = await runtime.getState(reviewThreadId)
    .then((snapshot) => parseReviewableState(snapshot.values))
    .catch(() => null)

  if (existingReview?.actionOutcome) {
    return reviewThreadId
  }

  await runtime.invoke({
    contextKind: 'entry',
    documentId: state.documentId,
    documentTitle: state.documentTitle,
    documentType: state.documentType,
    mode: 'on_demand',
    requestedAction: toFleetGraphRequestedAction(action),
    routeSurface: state.routeSurface,
    threadId: reviewThreadId,
    trigger: 'human-review',
    workspaceId: state.workspaceId,
  })

  return reviewThreadId
}

function ensureActionOutcome(
  state: ReviewableState
) {
  if (!state.actionOutcome) {
    throw new FleetGraphOnDemandActionError(
      'FleetGraph could not resolve the action outcome for this thread.',
      500
    )
  }

  if (state.actionOutcome.status === 'dismissed') {
    throw new FleetGraphOnDemandActionError(
      'FleetGraph review was dismissed before this action was applied.',
      409
    )
  }

  return state.actionOutcome
}

export function createFleetGraphOnDemandActionService(
  deps: FleetGraphOnDemandActionServiceDeps = {}
) {
  const runtime = deps.runtime ?? createFleetGraphRuntime()

  return {
    async reviewThreadAction(
      input: ReviewThreadActionInput
    ): Promise<{ action: FleetGraphOnDemandActionDraft; review: FleetGraphOnDemandActionReview }> {
      const { action, state } = await loadAnalysisState(runtime, input)
      const reviewThreadId = await ensureReviewThread(runtime, input, action, state)

      return {
        action,
        review: buildOnDemandActionReview(action, reviewThreadId),
      }
    },

    async applyThreadAction(
      input: ApplyThreadActionInput
    ): Promise<{ action: FleetGraphOnDemandActionDraft; actionOutcome: ReturnType<typeof ensureActionOutcome> }> {
      const { action, state } = await loadAnalysisState(runtime, input)
      const reviewThreadId = await ensureReviewThread(runtime, input, action, state)
      const currentReviewState = await runtime.getState(reviewThreadId)
        .then((snapshot) => parseReviewableState(snapshot.values))

      if (currentReviewState.actionOutcome && currentReviewState.actionOutcome.status !== 'dismissed') {
        return {
          action,
          actionOutcome: currentReviewState.actionOutcome,
        }
      }

      const resumedState = await runtime.resume(
        reviewThreadId,
        'approved',
        {
          fleetgraphActionRequestContext: buildShipRestRequestContext(input.request),
        }
      )

      return {
        action,
        actionOutcome: ensureActionOutcome(resumedState as ReviewableState),
      }
    },
  }
}
