import { z } from 'zod'

import {
  FleetGraphActionEndpointSchema,
  type FleetGraphRequestedAction,
} from '../contracts/actions.js'
import { FleetGraphActionTypeSchema } from './registry.js'

const nonEmptyString = z.string().min(1)

export const FLEETGRAPH_FINDING_ACTION_STATUSES = [
  'pending',
  'applied',
  'already_applied',
  'failed',
] as const

export const FleetGraphFindingActionStatusSchema = z.enum(
  FLEETGRAPH_FINDING_ACTION_STATUSES
)

export const FleetGraphFindingActionExecutionSchema = z.object({
  actionType: FleetGraphActionTypeSchema,
  appliedAt: z.string().datetime().optional(),
  attemptCount: z.number().int().positive(),
  endpoint: FleetGraphActionEndpointSchema,
  findingId: nonEmptyString,
  message: nonEmptyString,
  resultStatusCode: z.number().int().positive().optional(),
  status: FleetGraphFindingActionStatusSchema,
  updatedAt: z.string().datetime(),
}).strict()

export interface FleetGraphFindingActionExecutionRecord {
  actionType: z.infer<typeof FleetGraphActionTypeSchema>
  appliedAt?: Date
  attemptCount: number
  endpoint: Pick<FleetGraphRequestedAction['endpoint'], 'method' | 'path'>
  findingId: string
  message: string
  resultStatusCode?: number
  status: z.infer<typeof FleetGraphFindingActionStatusSchema>
  updatedAt: Date
}

export interface BeginFindingActionExecutionInput {
  actionType: z.infer<typeof FleetGraphActionTypeSchema>
  endpoint: Pick<FleetGraphRequestedAction['endpoint'], 'method' | 'path'>
  findingId: string
  workspaceId: string
}

export interface FinishFindingActionExecutionInput
  extends BeginFindingActionExecutionInput {
  appliedAt?: Date
  message: string
  resultStatusCode?: number
  status: Exclude<z.infer<typeof FleetGraphFindingActionStatusSchema>, 'pending'>
}

export interface BeginFindingActionExecutionResult {
  execution: FleetGraphFindingActionExecutionRecord
  shouldExecute: boolean
}

export interface FleetGraphFindingActionStore {
  beginExecution(
    input: BeginFindingActionExecutionInput,
    now?: Date
  ): Promise<BeginFindingActionExecutionResult>
  beginStartWeekExecution(
    input: Omit<BeginFindingActionExecutionInput, 'actionType'>,
    now?: Date
  ): Promise<BeginFindingActionExecutionResult>
  finishExecution(
    input: FinishFindingActionExecutionInput,
    now?: Date
  ): Promise<FleetGraphFindingActionExecutionRecord>
  finishStartWeekExecution(
    input: Omit<FinishFindingActionExecutionInput, 'actionType'>,
    now?: Date
  ): Promise<FleetGraphFindingActionExecutionRecord>
  listExecutionsForFindings(
    workspaceId: string,
    findingIds: string[]
  ): Promise<FleetGraphFindingActionExecutionRecord[]>
}
