import { z } from 'zod'

const nonEmptyString = z.string().min(1)

export const FLEETGRAPH_ACTION_TYPES = [
  'approve_project_plan',
  'approve_week_plan',
  'assign_owner',
  'post_comment',
  'start_week',
] as const

export const FLEETGRAPH_ACTION_TARGET_TYPES = [
  'document',
  'project',
  'sprint',
] as const

export const FLEETGRAPH_HTTP_METHODS = [
  'DELETE',
  'PATCH',
  'POST',
] as const

export const FleetGraphActionEndpointSchema = z.object({
  method: z.enum(FLEETGRAPH_HTTP_METHODS),
  path: nonEmptyString,
}).strict()

export const FleetGraphRequestedActionSchema = z.object({
  endpoint: FleetGraphActionEndpointSchema,
  evidence: z.array(nonEmptyString).min(1),
  rationale: nonEmptyString,
  summary: nonEmptyString,
  targetId: nonEmptyString,
  targetType: z.enum(FLEETGRAPH_ACTION_TARGET_TYPES),
  title: nonEmptyString,
  type: z.enum(FLEETGRAPH_ACTION_TYPES),
}).strict()

export type FleetGraphRequestedAction =
  z.infer<typeof FleetGraphRequestedActionSchema>
