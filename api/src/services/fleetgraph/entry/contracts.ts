import { z } from 'zod'

import {
  FleetGraphActionEndpointSchema,
  FleetGraphRequestedActionSchema,
} from '../contracts/actions.js'
import {
  FleetGraphActionOutcomeSchema,
  FLEETGRAPH_BRANCHES,
  FLEETGRAPH_OUTCOMES,
} from '../graph/index.js'
import {
  RawDocumentContextSchema,
  RouteSurfaceSchema,
} from '../normalize/index.js'

const nonEmptyString = z.string().min(1)

const FLEETGRAPH_ENTRY_TARGET_TYPES = [
  'document',
  'project',
  'sprint',
] as const

export const FleetGraphEntryTriggerSchema = z.object({
  actorId: nonEmptyString.optional(),
  documentId: nonEmptyString.optional(),
  documentType: nonEmptyString.optional(),
  mode: z.literal('on_demand').default('on_demand'),
  threadId: nonEmptyString.optional(),
  trigger: z.literal('document-context').default('document-context'),
  workspaceId: nonEmptyString.optional(),
}).strict()

export const FleetGraphEntryDraftSchema = z.object({
  requestedAction: FleetGraphRequestedActionSchema.optional(),
}).strict()

export const FleetGraphEntryRequestSchema = z.object({
  context: RawDocumentContextSchema,
  draft: FleetGraphEntryDraftSchema.optional(),
  route: RouteSurfaceSchema,
  trigger: FleetGraphEntryTriggerSchema,
}).strict()

export const FleetGraphEntryApplyRequestSchema = z.object({
  threadId: nonEmptyString,
}).strict()

const FleetGraphEntryCurrentSchema = z.object({
  documentType: nonEmptyString,
  id: nonEmptyString,
  title: z.string(),
}).strict()

const FleetGraphEntryRouteSummarySchema = z.object({
  activeTab: nonEmptyString.optional(),
  nestedPath: z.array(nonEmptyString),
  surface: nonEmptyString,
}).strict()

export const FleetGraphEntryRunSchema = z.object({
  branch: z.enum(FLEETGRAPH_BRANCHES),
  outcome: z.enum(FLEETGRAPH_OUTCOMES),
  path: z.array(nonEmptyString),
  routeSurface: nonEmptyString,
  threadId: nonEmptyString,
}).strict()

const FleetGraphApprovalOptionSchema = z.object({
  id: z.enum(['apply', 'dismiss', 'snooze']),
  label: nonEmptyString,
}).strict()

export const FleetGraphApprovalEnvelopeSchema = z.object({
  body: z.record(z.unknown()).optional(),
  endpoint: FleetGraphActionEndpointSchema,
  evidence: z.array(nonEmptyString).min(1),
  options: z.array(FleetGraphApprovalOptionSchema).length(3),
  rationale: nonEmptyString,
  state: z.literal('pending_confirmation'),
  summary: nonEmptyString,
  targetId: nonEmptyString,
  targetType: z.enum(FLEETGRAPH_ENTRY_TARGET_TYPES),
  title: nonEmptyString,
  type: FleetGraphRequestedActionSchema.shape.type,
}).strict()

const FleetGraphEntrySummarySchema = z.object({
  detail: nonEmptyString,
  surfaceLabel: nonEmptyString,
  title: nonEmptyString,
}).strict()

export const FleetGraphEntryResponseSchema = z.object({
  approval: FleetGraphApprovalEnvelopeSchema.optional(),
  entry: z.object({
    current: FleetGraphEntryCurrentSchema,
    route: FleetGraphEntryRouteSummarySchema,
    threadId: nonEmptyString,
  }).strict(),
  run: FleetGraphEntryRunSchema,
  summary: FleetGraphEntrySummarySchema,
}).strict()

export const FleetGraphEntryApplyResponseSchema = z.object({
  actionOutcome: FleetGraphActionOutcomeSchema,
  run: FleetGraphEntryRunSchema,
  summary: FleetGraphEntrySummarySchema,
}).strict()

export type FleetGraphEntryRequest =
  z.infer<typeof FleetGraphEntryRequestSchema>

export type FleetGraphRequestedAction =
  z.infer<typeof FleetGraphRequestedActionSchema>

export type FleetGraphEntryResponse =
  z.infer<typeof FleetGraphEntryResponseSchema>

export type FleetGraphEntryApplyRequest =
  z.infer<typeof FleetGraphEntryApplyRequestSchema>

export type FleetGraphEntryApplyResponse =
  z.infer<typeof FleetGraphEntryApplyResponseSchema>
