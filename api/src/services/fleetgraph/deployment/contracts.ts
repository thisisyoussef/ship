import { z } from 'zod'

export const FleetGraphReadinessIssueSchema = z.object({
  key: z.string(),
  message: z.string(),
})

export const FleetGraphSurfaceReadinessSchema = z.object({
  entryEnabled: z.boolean(),
  entryUrl: z.string().url().optional(),
  issues: z.array(FleetGraphReadinessIssueSchema),
  provider: z.string(),
  publicBaseUrl: z.string().url().optional(),
  ready: z.boolean(),
  readyUrl: z.string().url().optional(),
  serviceAuthConfigured: z.boolean(),
  surface: z.enum(['api', 'worker']),
  tracingEnabled: z.boolean(),
  workerEnabled: z.boolean(),
})

export const FleetGraphEvidenceChecklistItemSchema = z.object({
  id: z.enum(['worker-runtime', 'public-access-smoke', 'trace-evidence']),
  note: z.string(),
  status: z.enum(['ready', 'missing']),
})

export const FleetGraphEvidenceChecklistSchema = z.object({
  items: z.array(FleetGraphEvidenceChecklistItemSchema),
  ready: z.boolean(),
})

export const FleetGraphDeploymentReadinessResponseSchema = z.object({
  api: FleetGraphSurfaceReadinessSchema,
  checklist: FleetGraphEvidenceChecklistSchema,
  worker: FleetGraphSurfaceReadinessSchema,
})

export type FleetGraphDeploymentReadinessResponse = z.infer<
  typeof FleetGraphDeploymentReadinessResponseSchema
>
export type FleetGraphEvidenceChecklist = z.infer<
  typeof FleetGraphEvidenceChecklistSchema
>
export type FleetGraphReadinessIssue = z.infer<
  typeof FleetGraphReadinessIssueSchema
>
export type FleetGraphSurfaceReadiness = z.infer<
  typeof FleetGraphSurfaceReadinessSchema
>
