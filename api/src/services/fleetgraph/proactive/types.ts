import { z } from 'zod'

import { FleetGraphRequestedActionSchema } from '../entry/contracts.js'

const nonEmptyString = z.string().min(1)

export const ShipWeekSummarySchema = z.object({
  has_plan: z.boolean().optional(),
  id: nonEmptyString,
  issue_count: z.number().int().nonnegative(),
  name: z.string(),
  owner: z.object({
    email: z.string().optional(),
    id: nonEmptyString,
    name: z.string(),
  }).nullable(),
  program_name: z.string().nullable().optional(),
  sprint_number: z.number().int().positive(),
  status: z.enum(['planning', 'active', 'completed']),
  workspace_sprint_start_date: z.string(),
}).passthrough()

const RawShipWeeksResponseSchema = z.object({
  weeks: z.array(ShipWeekSummarySchema),
  sprint_start_date: z.string().optional(),
  workspace_sprint_start_date: z.string().optional(),
}).passthrough()

export const ShipWeeksResponseSchema = RawShipWeeksResponseSchema.transform((input, ctx) => {
  const workspaceSprintStartDate = input.workspace_sprint_start_date
    ?? input.weeks[0]?.workspace_sprint_start_date
    ?? input.sprint_start_date

  if (!workspaceSprintStartDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'workspace_sprint_start_date is required in Ship weeks responses.',
      path: ['workspace_sprint_start_date'],
    })
    return z.NEVER
  }

  return {
    weeks: input.weeks,
    workspace_sprint_start_date: workspaceSprintStartDate,
  }
})

export interface WeekStartDriftCandidate {
  startDate: Date
  statusReason: 'planning_after_start' | 'zero_issues_after_start'
  week: z.infer<typeof ShipWeekSummarySchema>
}

export interface FleetGraphShipApiClient {
  listWeeks(): Promise<z.infer<typeof ShipWeeksResponseSchema>>
}

export interface FleetGraphProactiveFindingDraft {
  evidence: string[]
  findingKey: string
  metadata: Record<string, unknown>
  recommendedAction: z.infer<typeof FleetGraphRequestedActionSchema>
  summary: string
  title: string
}
