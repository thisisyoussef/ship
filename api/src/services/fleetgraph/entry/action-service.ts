import { z } from 'zod'
import type { Request } from 'express'

import {
  buildShipRestRequestContext,
} from '../actions/index.js'
import {
  FleetGraphStateSchema,
  type FleetGraphInterruptSummary,
  type FleetGraphState,
} from '../graph/index.js'
import {
  FleetGraphEntryApplyRequestSchema,
  FleetGraphEntryApplyResponseSchema,
  type FleetGraphEntryApplyResponse,
} from './contracts.js'

interface FleetGraphEntryActionRuntime {
  getPendingInterrupts(threadId: string): Promise<FleetGraphInterruptSummary[]>
  getState(threadId: string): Promise<{ values: unknown }>
  resume(
    threadId: string,
    value: unknown,
    configurable?: Record<string, unknown>
  ): Promise<FleetGraphState>
}

interface FleetGraphEntryActionServiceDeps {
  runtime: FleetGraphEntryActionRuntime
}

interface ApplyEntryActionInput {
  request: Pick<Request, 'get' | 'header' | 'protocol'>
  workspaceId: string
}

export class FleetGraphEntryActionError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message)
  }
}

function parseState(values: unknown) {
  return FleetGraphStateSchema.parse(values) as FleetGraphState
}

function parseApplyRequest(input: unknown) {
  try {
    return FleetGraphEntryApplyRequestSchema.parse(input)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new FleetGraphEntryActionError(
        400,
        error.issues[0]?.message ?? 'Invalid FleetGraph entry apply payload'
      )
    }
    throw error
  }
}

function buildSummary(state: FleetGraphState): FleetGraphEntryApplyResponse['summary'] {
  const status = state.actionOutcome?.status
  const title = status === 'failed'
    ? 'FleetGraph could not complete the action.'
    : status === 'already_applied'
      ? 'FleetGraph found this step was already complete.'
      : 'FleetGraph completed the action.'

  return {
    detail: state.actionOutcome?.message
      ?? 'FleetGraph finished processing this approval step.',
    surfaceLabel: state.routeSurface,
    title,
  }
}

function ensureEntryApprovalState(
  state: FleetGraphState,
  pendingInterrupts: FleetGraphInterruptSummary[],
  workspaceId: string
) {
  if (state.workspaceId !== workspaceId) {
    throw new FleetGraphEntryActionError(
      403,
      'FleetGraph entry workspace does not match the authenticated workspace'
    )
  }

  if (state.contextKind !== 'entry') {
    throw new FleetGraphEntryActionError(
      400,
      'This FleetGraph thread is not an entry approval thread'
    )
  }

  if (!state.selectedAction) {
    throw new FleetGraphEntryActionError(
      409,
      'This FleetGraph approval is no longer waiting for confirmation'
    )
  }

  if (!pendingInterrupts.some((interrupt) => interrupt.taskName === 'approval_interrupt')) {
    throw new FleetGraphEntryActionError(
      409,
      'This FleetGraph approval is no longer waiting for confirmation'
    )
  }
}

export function createFleetGraphEntryActionService(
  deps: FleetGraphEntryActionServiceDeps
) {
  return {
    async applyEntry(input: unknown, auth: ApplyEntryActionInput): Promise<FleetGraphEntryApplyResponse> {
      const parsed = parseApplyRequest(input)

      let existingState: FleetGraphState
      try {
        const snapshot = await deps.runtime.getState(parsed.threadId)
        existingState = parseState(snapshot.values)
      } catch (error) {
        if (error instanceof FleetGraphEntryActionError) {
          throw error
        }
        throw new FleetGraphEntryActionError(
          404,
          'No active FleetGraph approval was found for this page'
        )
      }

      const pendingInterrupts = await deps.runtime.getPendingInterrupts(parsed.threadId)
        .catch(() => [])

      ensureEntryApprovalState(existingState, pendingInterrupts, auth.workspaceId)

      const resumed = await deps.runtime.resume(
        parsed.threadId,
        'approved',
        {
          fleetgraphActionRequestContext: buildShipRestRequestContext(auth.request),
        }
      )

      if (!resumed.actionOutcome) {
        throw new FleetGraphEntryActionError(
          500,
          'FleetGraph did not record the action outcome for this approval'
        )
      }

      return FleetGraphEntryApplyResponseSchema.parse({
        actionOutcome: resumed.actionOutcome,
        run: {
          branch: resumed.branch,
          outcome: resumed.outcome,
          path: resumed.path,
          routeSurface: resumed.routeSurface,
          threadId: resumed.threadId,
        },
        summary: buildSummary(resumed),
      })
    },
  }
}
