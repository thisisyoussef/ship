import { z } from 'zod'

import { FleetGraphRequestedActionSchema } from '../contracts/actions.js'
import {
  FleetGraphFindingActionExecutionSchema,
  type FleetGraphFindingActionExecutionRecord,
} from '../actions/types.js'

export const FLEETGRAPH_FINDING_TYPES = [
  'sprint_no_owner',
  'week_start_drift',
] as const

export const FLEETGRAPH_FINDING_STATUSES = [
  'active',
  'dismissed',
  'resolved',
  'snoozed',
] as const

const nonEmptyString = z.string().min(1)

export const FleetGraphFindingTypeSchema = z.enum(FLEETGRAPH_FINDING_TYPES)
export const FleetGraphFindingStatusSchema = z.enum(FLEETGRAPH_FINDING_STATUSES)

export const FleetGraphProactiveFindingSchema = z.object({
  actionExecution: FleetGraphFindingActionExecutionSchema.optional(),
  cooldownUntil: z.string().datetime().optional(),
  dedupeKey: nonEmptyString,
  documentId: nonEmptyString,
  documentType: nonEmptyString,
  evidence: z.array(nonEmptyString),
  findingKey: nonEmptyString,
  findingType: FleetGraphFindingTypeSchema,
  id: nonEmptyString,
  metadata: z.record(z.unknown()),
  recommendedAction: FleetGraphRequestedActionSchema.optional(),
  snoozedUntil: z.string().datetime().optional(),
  status: FleetGraphFindingStatusSchema,
  summary: nonEmptyString,
  threadId: nonEmptyString,
  title: nonEmptyString,
  tracePublicUrl: nonEmptyString.optional(),
  traceRunId: nonEmptyString.optional(),
  updatedAt: z.string().datetime(),
  workspaceId: nonEmptyString,
}).strict()

export const FleetGraphFindingListResponseSchema = z.object({
  findings: z.array(FleetGraphProactiveFindingSchema),
}).strict()

export const FleetGraphFindingLifecycleResponseSchema = z.object({
  finding: FleetGraphProactiveFindingSchema,
}).strict()

export const FleetGraphSnoozeRequestSchema = z.object({
  minutes: z.number().int().positive().max(7 * 24 * 60).default(240),
}).strict()

export interface FleetGraphFindingRecord {
  actionExecution?: FleetGraphFindingActionExecutionRecord
  cooldownUntil?: Date
  dedupeKey: string
  documentId: string
  documentType: string
  evidence: string[]
  findingKey: string
  findingType: z.infer<typeof FleetGraphFindingTypeSchema>
  id: string
  metadata: Record<string, unknown>
  recommendedAction?: z.infer<typeof FleetGraphRequestedActionSchema>
  snoozedUntil?: Date
  status: z.infer<typeof FleetGraphFindingStatusSchema>
  summary: string
  threadId: string
  title: string
  tracePublicUrl?: string
  traceRunId?: string
  updatedAt: Date
  workspaceId: string
}

export interface FleetGraphUpsertFindingInput {
  cooldownUntil?: Date
  dedupeKey: string
  documentId: string
  documentType: string
  evidence: string[]
  findingKey: string
  findingType: z.infer<typeof FleetGraphFindingTypeSchema>
  metadata?: Record<string, unknown>
  recommendedAction?: z.infer<typeof FleetGraphRequestedActionSchema>
  threadId: string
  title: string
  summary: string
  tracePublicUrl?: string
  traceRunId?: string
  workspaceId: string
}

export interface FleetGraphFindingStore {
  dismissFinding(id: string, workspaceId: string, now?: Date): Promise<FleetGraphFindingRecord | null>
  getFindingById(id: string, workspaceId: string): Promise<FleetGraphFindingRecord | null>
  getFindingByKey(findingKey: string): Promise<FleetGraphFindingRecord | null>
  listActiveFindings(input: { documentIds?: string[]; workspaceId: string }): Promise<FleetGraphFindingRecord[]>
  resolveFinding(findingKey: string, now?: Date): Promise<FleetGraphFindingRecord | null>
  snoozeFinding(id: string, workspaceId: string, snoozedUntil: Date, now?: Date): Promise<FleetGraphFindingRecord | null>
  upsertFinding(input: FleetGraphUpsertFindingInput, now?: Date): Promise<FleetGraphFindingRecord>
}
