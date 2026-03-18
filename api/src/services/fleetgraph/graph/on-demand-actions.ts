import { z } from 'zod'

import {
  FleetGraphActionEndpointSchema,
  type FleetGraphRequestedAction,
} from '../contracts/actions.js'

const SUPPORTED_ON_DEMAND_ACTION_TYPES = [
  'approve_project_plan',
  'approve_week_plan',
  'start_week',
] as const

const SUPPORTED_TARGET_TYPES = [
  'project',
  'sprint',
] as const

const nonEmptyString = z.string().min(1)

export const FleetGraphOnDemandActionTypeSchema =
  z.enum(SUPPORTED_ON_DEMAND_ACTION_TYPES)

export const FleetGraphOnDemandActionDraftSchema = z.object({
  actionId: nonEmptyString,
  actionType: FleetGraphOnDemandActionTypeSchema,
  dialogKind: z.literal('confirm'),
  endpoint: FleetGraphActionEndpointSchema,
  evidence: z.array(nonEmptyString).min(1),
  label: nonEmptyString,
  reviewSummary: nonEmptyString,
  reviewTitle: nonEmptyString,
  targetId: nonEmptyString,
  targetType: z.enum(SUPPORTED_TARGET_TYPES),
}).strict()

export const FleetGraphOnDemandActionReviewSchema = z.object({
  cancelLabel: nonEmptyString,
  confirmLabel: nonEmptyString,
  evidence: z.array(nonEmptyString).min(1),
  summary: nonEmptyString,
  threadId: nonEmptyString,
  title: nonEmptyString,
}).strict()

export const FleetGraphOnDemandActionReviewResponseSchema = z.object({
  action: FleetGraphOnDemandActionDraftSchema,
  review: FleetGraphOnDemandActionReviewSchema,
}).strict()

export const FleetGraphOnDemandActionApplyResponseSchema = z.object({
  action: FleetGraphOnDemandActionDraftSchema,
  actionOutcome: z.object({
    message: nonEmptyString,
    resultStatusCode: z.number().int().positive().optional(),
    status: z.enum(['already_applied', 'applied', 'failed']),
  }).strict(),
}).strict()

export type FleetGraphOnDemandActionType =
  z.infer<typeof FleetGraphOnDemandActionTypeSchema>

export type FleetGraphOnDemandActionDraft =
  z.infer<typeof FleetGraphOnDemandActionDraftSchema>

export type FleetGraphOnDemandActionReview =
  z.infer<typeof FleetGraphOnDemandActionReviewSchema>

const ACTION_CONFIG = {
  approve_project_plan: {
    confirmLabel: 'Approve project plan',
    endpointPattern: /^\/api\/projects\/[^/]+\/approve-plan$/,
    label: 'Review project approval',
    reviewSummary: 'FleetGraph is ready to approve this project plan. Nothing changes in Ship until you confirm.',
    reviewTitle: 'Confirm before approving this project plan',
    targetType: 'project',
  },
  approve_week_plan: {
    confirmLabel: 'Approve week plan',
    endpointPattern: /^\/api\/weeks\/[^/]+\/approve-plan$/,
    label: 'Review week approval',
    reviewSummary: 'FleetGraph is ready to approve this week plan. Nothing changes in Ship until you confirm.',
    reviewTitle: 'Confirm before approving this week plan',
    targetType: 'sprint',
  },
  start_week: {
    confirmLabel: 'Start week in Ship',
    endpointPattern: /^\/api\/weeks\/[^/]+\/start$/,
    label: 'Review and apply',
    reviewSummary: 'FleetGraph thinks this week is ready to start. Nothing changes in Ship until you confirm.',
    reviewTitle: 'Confirm before starting this week',
    targetType: 'sprint',
  },
} as const satisfies Record<FleetGraphOnDemandActionType, {
  confirmLabel: string
  endpointPattern: RegExp
  label: string
  reviewSummary: string
  reviewTitle: string
  targetType: 'project' | 'sprint'
}>

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
}

function readEndpoint(value: unknown) {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const rawMethod = readString((value as Record<string, unknown>).method)
  const method = rawMethod === 'POST' || rawMethod === 'PATCH' || rawMethod === 'DELETE'
    ? rawMethod
    : undefined
  const path = readString((value as Record<string, unknown>).path)
  if (!method || !path) {
    return undefined
  }

  return {
    method,
    path: path.startsWith('/api/')
      ? path
      : `/api${path.startsWith('/') ? '' : '/'}${path}`,
  }
}

export function buildOnDemandActionId(
  actionType: FleetGraphOnDemandActionType,
  targetId: string
) {
  return `${actionType}:${targetId}`
}

export function buildOnDemandActionReviewThreadId(
  threadId: string,
  actionId: string
) {
  return `${threadId}:action:${actionId}`
}

export function getOnDemandActionConfig(
  actionType: FleetGraphOnDemandActionType
) {
  return ACTION_CONFIG[actionType]
}

export function sanitizeOnDemandActionDraft(
  input: unknown
): FleetGraphOnDemandActionDraft | undefined {
  if (typeof input !== 'object' || input === null) {
    return undefined
  }

  const record = input as Record<string, unknown>
  const actionTypeRaw = readString(record.actionType)
  const actionTypeParsed = FleetGraphOnDemandActionTypeSchema.safeParse(actionTypeRaw)
  if (!actionTypeParsed.success) {
    return undefined
  }
  const actionType = actionTypeParsed.data

  const targetId = readString(record.targetId)
  const endpoint = readEndpoint(record.endpoint)
  if (!targetId || !endpoint) {
    return undefined
  }

  const config = ACTION_CONFIG[actionType]
  if (!config.endpointPattern.test(endpoint.path)) {
    return undefined
  }

  const targetType = readString(record.targetType)
  if (targetType !== config.targetType) {
    return undefined
  }

  const evidence = Array.isArray(record.evidence)
    ? record.evidence.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  if (evidence.length === 0) {
    return undefined
  }

  return FleetGraphOnDemandActionDraftSchema.parse({
    actionId: buildOnDemandActionId(actionType, targetId),
    actionType,
    dialogKind: 'confirm',
    endpoint,
    evidence,
    label: config.label,
    reviewSummary: config.reviewSummary,
    reviewTitle: config.reviewTitle,
    targetId,
    targetType: config.targetType,
  })
}

export function toFleetGraphRequestedAction(
  action: FleetGraphOnDemandActionDraft
): FleetGraphRequestedAction {
  return {
    endpoint: action.endpoint,
    evidence: action.evidence,
    rationale: action.reviewSummary,
    summary: action.reviewSummary,
    targetId: action.targetId,
    targetType: action.targetType,
    title: action.reviewTitle,
    type: action.actionType,
  }
}

export function buildOnDemandActionReview(
  action: FleetGraphOnDemandActionDraft,
  threadId: string
): FleetGraphOnDemandActionReview {
  return FleetGraphOnDemandActionReviewSchema.parse({
    cancelLabel: 'Cancel',
    confirmLabel: getOnDemandActionConfig(action.actionType).confirmLabel,
    evidence: action.evidence,
    summary: action.reviewSummary,
    threadId,
    title: action.reviewTitle,
  })
}
