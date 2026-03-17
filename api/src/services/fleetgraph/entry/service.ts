import { z } from 'zod'

import type { AuthContext } from '../../../routes/route-helpers.js'
import type { FleetGraphState } from '../graph/index.js'
import { createShipContextEnvelope } from '../normalize/index.js'
import {
  FleetGraphApprovalEnvelopeSchema,
  FleetGraphEntryRequestSchema,
  FleetGraphEntryResponseSchema,
  type FleetGraphEntryRequest,
  type FleetGraphEntryResponse,
  type FleetGraphRequestedAction,
} from './contracts.js'

interface FleetGraphEntryRuntime {
  invoke(input: unknown): Promise<FleetGraphState>
}

interface FleetGraphEntryServiceDeps {
  runtime: FleetGraphEntryRuntime
}

const ACTION_SHAPE_BY_TYPE = {
  approve_project_plan: {
    method: 'POST',
    path: (targetId: string) => `/api/projects/${targetId}/approve-plan`,
    targetType: 'project',
  },
  approve_week_plan: {
    method: 'POST',
    path: (targetId: string) => `/api/weeks/${targetId}/approve-plan`,
    targetType: 'sprint',
  },
  assign_issues: {
    method: 'PATCH',
    path: (targetId: string) => `/api/documents/${targetId}`,
    targetType: 'sprint',
  },
  assign_owner: {
    method: 'PATCH',
    path: (targetId: string) => `/api/documents/${targetId}`,
    targetType: 'sprint',
  },
  post_comment: {
    method: 'POST',
    path: (targetId: string) => `/api/documents/${targetId}/comments`,
    targetType: 'document',
  },
  start_week: {
    method: 'POST',
    path: (targetId: string) => `/api/weeks/${targetId}/start`,
    targetType: 'sprint',
  },
} as const

const APPROVAL_OPTIONS = [
  { id: 'apply', label: 'Apply' },
  { id: 'dismiss', label: 'Dismiss' },
  { id: 'snooze', label: 'Snooze' },
] as const

export class FleetGraphEntryError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message)
  }
}

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildThreadId(input: FleetGraphEntryRequest, workspaceId: string) {
  const documentId = input.trigger.documentId ?? input.context.current.id
  const tab = input.route.activeTab ? sanitizeSegment(input.route.activeTab) : 'current'
  const nested = input.route.nestedPath.length > 0
    ? sanitizeSegment(input.route.nestedPath.join('-'))
    : 'root'

  return [
    'fleetgraph',
    workspaceId,
    'entry',
    documentId,
    tab,
    nested,
  ].join(':')
}

function buildSurfaceLabel(input: FleetGraphEntryRequest) {
  const parts: string[] = [input.route.surface]
  if (input.route.activeTab) {
    parts.push(input.route.activeTab)
  }
  if (input.route.nestedPath.length > 0) {
    parts.push(input.route.nestedPath.join('/'))
  }
  return parts.join(' / ')
}

function ensureAllowedAction(action: FleetGraphRequestedAction) {
  const expected = ACTION_SHAPE_BY_TYPE[action.type]
  if (!expected) {
    throw new FleetGraphEntryError(400, 'Unsupported FleetGraph action type')
  }

  if (action.endpoint.method !== expected.method) {
    throw new FleetGraphEntryError(400, 'Approval endpoint method does not match the action type')
  }

  if (action.endpoint.path !== expected.path(action.targetId)) {
    throw new FleetGraphEntryError(400, 'Approval endpoint path does not match the action target')
  }

  if (action.targetType !== expected.targetType) {
    throw new FleetGraphEntryError(400, 'Approval target type does not match the action type')
  }
}

function buildApproval(action: FleetGraphRequestedAction) {
  return FleetGraphApprovalEnvelopeSchema.parse({
    ...action,
    options: APPROVAL_OPTIONS,
    state: 'pending_confirmation',
  })
}

function buildSummary(
  input: FleetGraphEntryRequest,
  response: FleetGraphEntryResponse['entry'],
  state: FleetGraphState
) {
  const title = state.outcome === 'approval_required'
    ? 'FleetGraph paused for human approval.'
    : state.outcome === 'quiet'
      ? `FleetGraph has no action for this ${response.current.documentType} right now.`
    : `FleetGraph is ready in this ${response.current.documentType} context.`

  return {
    detail: state.outcome === 'approval_required'
      ? `Review the suggested next step for ${response.current.title}.`
      : state.outcome === 'quiet'
        ? `FleetGraph checked ${response.current.title} and did not find anything that needs action yet.`
      : `FleetGraph reviewed ${response.current.title} and can help from this page.`,
    surfaceLabel: buildSurfaceLabel(input),
    title,
  }
}

function parseRequest(input: unknown) {
  try {
    return FleetGraphEntryRequestSchema.parse(input)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new FleetGraphEntryError(400, error.issues[0]?.message ?? 'Invalid FleetGraph entry payload')
    }
    throw error
  }
}

export function createFleetGraphEntryService(
  deps: FleetGraphEntryServiceDeps
) {
  return {
    async createEntry(input: unknown, auth: AuthContext): Promise<FleetGraphEntryResponse> {
      const parsed = parseRequest(input)
      const workspaceId = parsed.trigger.workspaceId ?? auth.workspaceId

      if (workspaceId !== auth.workspaceId) {
        throw new FleetGraphEntryError(403, 'FleetGraph entry workspace does not match the authenticated workspace')
      }

      const trigger = {
        actorId: auth.userId,
        documentId: parsed.trigger.documentId ?? parsed.context.current.id,
        documentType: parsed.trigger.documentType ?? parsed.context.current.document_type,
        mode: parsed.trigger.mode,
        threadId: parsed.trigger.threadId ?? buildThreadId(parsed, workspaceId),
        trigger: parsed.trigger.trigger,
        workspaceId,
      }

      if (parsed.draft?.requestedAction) {
        ensureAllowedAction(parsed.draft.requestedAction)
      }

      const entry = createShipContextEnvelope({
        context: parsed.context,
        route: parsed.route,
        trigger,
      })

      const state = await deps.runtime.invoke({
        contextKind: 'entry',
        documentId: entry.current.id,
        documentTitle: entry.current.title,
        documentType: entry.current.documentType,
        mode: entry.trigger.mode,
        requestedAction: parsed.draft?.requestedAction,
        routeSurface: entry.route.surface,
        threadId: entry.trigger.threadId,
        trigger: entry.trigger.trigger,
        workspaceId: entry.trigger.workspaceId,
      })

      const response = FleetGraphEntryResponseSchema.parse({
        approval: parsed.draft?.requestedAction
          ? buildApproval(parsed.draft.requestedAction)
          : undefined,
        entry: {
          current: {
            documentType: entry.current.documentType,
            id: entry.current.id,
            title: entry.current.title,
          },
          route: {
            activeTab: entry.route.activeTab,
            nestedPath: entry.route.nestedPath,
            surface: entry.route.surface,
          },
          threadId: entry.trigger.threadId,
        },
        run: {
          branch: state.branch,
          outcome: state.outcome,
          path: state.path,
          routeSurface: state.routeSurface,
          threadId: state.threadId,
        },
        summary: buildSummary(parsed, {
          current: {
            documentType: entry.current.documentType,
            id: entry.current.id,
            title: entry.current.title,
          },
          route: {
            activeTab: entry.route.activeTab,
            nestedPath: entry.route.nestedPath,
            surface: entry.route.surface,
          },
          threadId: entry.trigger.threadId,
        }, state),
      })

      return response
    },
  }
}
