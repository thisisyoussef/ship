/**
 * Shared FleetGraph Action Registry
 *
 * This module defines the action vocabulary shared across proactive and on-demand flows.
 * Every action goes through the same review/apply pipeline with typed dialogs and
 * validated execution.
 */

import { z } from 'zod'

/* ------------------------------------------------------------------ */
/*  Action Types                                                       */
/* ------------------------------------------------------------------ */

export const FLEETGRAPH_ACTION_TYPES = [
  'approve_project_plan',
  'approve_week_plan',
  'assign_issues',
  'assign_owner',
  'post_comment',
  'start_week',
] as const

export const FleetGraphActionTypeSchema = z.enum(FLEETGRAPH_ACTION_TYPES)
export type FleetGraphActionType = z.infer<typeof FleetGraphActionTypeSchema>

/* ------------------------------------------------------------------ */
/*  Target Types                                                       */
/* ------------------------------------------------------------------ */

export const FLEETGRAPH_TARGET_TYPES = [
  'document',
  'issue',
  'project',
  'sprint',
] as const

export const FleetGraphTargetTypeSchema = z.enum(FLEETGRAPH_TARGET_TYPES)
export type FleetGraphTargetType = z.infer<typeof FleetGraphTargetTypeSchema>

/* ------------------------------------------------------------------ */
/*  Dialog Kinds                                                       */
/* ------------------------------------------------------------------ */

export const FLEETGRAPH_DIALOG_KINDS = [
  'confirm',
  'single_select',
  'multi_select',
  'text_input',
  'textarea',
  'composite', // For actions like assign_issues that need multiple inputs
] as const

export const FleetGraphDialogKindSchema = z.enum(FLEETGRAPH_DIALOG_KINDS)
export type FleetGraphDialogKind = z.infer<typeof FleetGraphDialogKindSchema>

/* ------------------------------------------------------------------ */
/*  Execution Adapters                                                 */
/* ------------------------------------------------------------------ */

export const FLEETGRAPH_EXECUTION_ADAPTERS = [
  'single_request',   // One Ship REST call
  'document_patch',   // PATCH to /api/documents/:id
  'multi_request',    // Fan-out of multiple calls
  'fleetgraph_composed', // FleetGraph-managed composed writes
] as const

export const FleetGraphExecutionAdapterSchema = z.enum(FLEETGRAPH_EXECUTION_ADAPTERS)
export type FleetGraphExecutionAdapter = z.infer<typeof FleetGraphExecutionAdapterSchema>

/* ------------------------------------------------------------------ */
/*  HTTP Methods                                                       */
/* ------------------------------------------------------------------ */

export const FLEETGRAPH_HTTP_METHODS = ['DELETE', 'PATCH', 'POST'] as const
export const FleetGraphHttpMethodSchema = z.enum(FLEETGRAPH_HTTP_METHODS)

/* ------------------------------------------------------------------ */
/*  Dialog Field Types                                                 */
/* ------------------------------------------------------------------ */

const nonEmptyString = z.string().min(1)

// Option for select fields
export const FleetGraphSelectOptionSchema = z.object({
  disabled: z.boolean().optional(),
  description: z.string().optional(),
  label: nonEmptyString,
  value: nonEmptyString,
})
export type FleetGraphSelectOption = z.infer<typeof FleetGraphSelectOptionSchema>

// Field definitions for dialog
export const FleetGraphDialogFieldSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hidden'),
    name: nonEmptyString,
    value: nonEmptyString,
  }),
  z.object({
    type: z.literal('single_select'),
    name: nonEmptyString,
    label: nonEmptyString,
    placeholder: z.string().optional(),
    required: z.boolean().default(true),
    options: z.array(FleetGraphSelectOptionSchema),
  }),
  z.object({
    type: z.literal('multi_select'),
    name: nonEmptyString,
    label: nonEmptyString,
    placeholder: z.string().optional(),
    required: z.boolean().default(true),
    minItems: z.number().int().min(0).default(1),
    maxItems: z.number().int().min(1).optional(),
    options: z.array(FleetGraphSelectOptionSchema),
  }),
  z.object({
    type: z.literal('text_input'),
    name: nonEmptyString,
    label: nonEmptyString,
    placeholder: z.string().optional(),
    required: z.boolean().default(true),
    minLength: z.number().int().min(0).default(1),
    maxLength: z.number().int().min(1).optional(),
  }),
  z.object({
    type: z.literal('textarea'),
    name: nonEmptyString,
    label: nonEmptyString,
    placeholder: z.string().optional(),
    required: z.boolean().default(true),
    minLength: z.number().int().min(0).default(1),
    maxLength: z.number().int().min(1).optional(),
    rows: z.number().int().min(1).default(4),
  }),
])
export type FleetGraphDialogField = z.infer<typeof FleetGraphDialogFieldSchema>

/* ------------------------------------------------------------------ */
/*  Dialog Spec                                                        */
/* ------------------------------------------------------------------ */

export const FleetGraphDialogSpecSchema = z.object({
  kind: FleetGraphDialogKindSchema,
  fields: z.array(FleetGraphDialogFieldSchema).default([]),
  title: nonEmptyString,
  summary: nonEmptyString,
  confirmLabel: nonEmptyString,
  cancelLabel: nonEmptyString.default('Cancel'),
  evidence: z.array(nonEmptyString).min(1),
})
export type FleetGraphDialogSpec = z.infer<typeof FleetGraphDialogSpecSchema>

/* ------------------------------------------------------------------ */
/*  Dialog Submission                                                  */
/* ------------------------------------------------------------------ */

export const FleetGraphDialogSubmissionSchema = z.object({
  actionId: nonEmptyString,
  values: z.record(z.string(), z.union([
    z.string(),
    z.array(z.string()),
    z.null(),
  ])),
})
export type FleetGraphDialogSubmission = z.infer<typeof FleetGraphDialogSubmissionSchema>

/* ------------------------------------------------------------------ */
/*  Action Draft (what the LLM produces)                               */
/* ------------------------------------------------------------------ */

export const FleetGraphActionDraftSchema = z.object({
  actionId: nonEmptyString,
  actionType: FleetGraphActionTypeSchema,
  targetId: nonEmptyString,
  targetType: FleetGraphTargetTypeSchema,
  evidence: z.array(nonEmptyString).min(1),
  rationale: nonEmptyString,
  // Optional context for dialog hydration
  contextHints: z.record(z.string(), z.unknown()).optional(),
})
export type FleetGraphActionDraft = z.infer<typeof FleetGraphActionDraftSchema>

/* ------------------------------------------------------------------ */
/*  Endpoint Schema                                                    */
/* ------------------------------------------------------------------ */

export const FleetGraphEndpointSchema = z.object({
  method: FleetGraphHttpMethodSchema,
  path: nonEmptyString,
  body: z.record(z.string(), z.unknown()).optional(),
})
export type FleetGraphEndpoint = z.infer<typeof FleetGraphEndpointSchema>

/* ------------------------------------------------------------------ */
/*  Execution Plan                                                     */
/* ------------------------------------------------------------------ */

export const FleetGraphExecutionPlanSchema = z.object({
  adapter: FleetGraphExecutionAdapterSchema,
  endpoints: z.array(FleetGraphEndpointSchema).min(1),
  // For composed writes, the order matters
  sequential: z.boolean().default(false),
  // Stale-state check before execution
  staleCheck: z.object({
    endpoint: FleetGraphEndpointSchema,
    expectedField: nonEmptyString,
    expectedValue: z.unknown(),
  }).optional(),
})
export type FleetGraphExecutionPlan = z.infer<typeof FleetGraphExecutionPlanSchema>

/* ------------------------------------------------------------------ */
/*  Action Definition (registry entry)                                 */
/* ------------------------------------------------------------------ */

export interface FleetGraphActionDefinition {
  actionType: FleetGraphActionType
  targetType: FleetGraphTargetType
  dialogKind: FleetGraphDialogKind
  executionAdapter: FleetGraphExecutionAdapter

  // Static review copy
  label: string
  reviewTitle: string
  reviewSummary: string
  confirmLabel: string

  // Endpoint pattern validation
  endpointPattern: RegExp

  // Option hydration (returns options for select fields)
  hydrateOptions?: (context: {
    targetId: string
    workspaceId: string
  }) => Promise<Record<string, FleetGraphSelectOption[]>>

  // Dialog builder (creates dialog spec from draft)
  buildDialogSpec: (
    draft: FleetGraphActionDraft,
    options: Record<string, FleetGraphSelectOption[]>
  ) => FleetGraphDialogSpec

  // Validate submission against dialog spec
  validateSubmission: (
    submission: FleetGraphDialogSubmission,
    dialogSpec: FleetGraphDialogSpec
  ) => { valid: true } | { valid: false; error: string }

  // Build execution plan from validated submission
  buildExecutionPlan: (
    draft: FleetGraphActionDraft,
    submission: FleetGraphDialogSubmission
  ) => FleetGraphExecutionPlan
}

/* ------------------------------------------------------------------ */
/*  Action Registry                                                    */
/* ------------------------------------------------------------------ */

const registry = new Map<FleetGraphActionType, FleetGraphActionDefinition>()

export function registerAction(definition: FleetGraphActionDefinition): void {
  registry.set(definition.actionType, definition)
}

export function getActionDefinition(
  actionType: FleetGraphActionType
): FleetGraphActionDefinition | undefined {
  return registry.get(actionType)
}

export function hasActionDefinition(actionType: FleetGraphActionType): boolean {
  return registry.has(actionType)
}

export function getAllActionTypes(): FleetGraphActionType[] {
  return Array.from(registry.keys())
}

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                  */
/* ------------------------------------------------------------------ */

export function buildActionId(
  actionType: FleetGraphActionType,
  targetId: string
): string {
  return `${actionType}:${targetId}`
}

export function parseActionId(
  actionId: string
): { actionType: FleetGraphActionType; targetId: string } | undefined {
  const parts = actionId.split(':')
  if (parts.length < 2) return undefined

  const actionType = parts[0]
  const targetId = parts.slice(1).join(':')

  const parsed = FleetGraphActionTypeSchema.safeParse(actionType)
  if (!parsed.success) return undefined

  return { actionType: parsed.data, targetId }
}
