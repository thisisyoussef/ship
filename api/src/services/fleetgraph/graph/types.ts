import { z } from 'zod'

import { FLEETGRAPH_FINDING_ACTION_STATUSES } from '../actions/types.js'
import {
  FleetGraphRequestedActionSchema,
  type FleetGraphRequestedAction,
} from '../contracts/actions.js'
import {
  FleetGraphOnDemandActionDraftSchema,
  type FleetGraphOnDemandActionDraft,
} from './on-demand-actions.js'

export const FLEETGRAPH_BRANCHES = [
  'quiet',
  'reasoned',
  'approval_required',
  'fallback',
] as const

export const FLEETGRAPH_MODES = [
  'proactive',
  'on_demand',
] as const

export const FLEETGRAPH_OUTCOMES = [
  'quiet',
  'advisory',
  'approval_required',
  'fallback',
] as const

export const FLEETGRAPH_TRIGGERS = [
  'document-context',
  'event',
  'scheduled-sweep',
  'human-review',
] as const

export const FLEETGRAPH_RUN_CONTEXTS = [
  'entry',
  'finding_review',
  'proactive',
] as const

export const FLEETGRAPH_SCENARIOS = [
  'entry_context_check',
  'entry_requested_action',
  'finding_action_review',
  'on_demand_analysis',
  'sprint_no_owner',
  'unassigned_sprint_issues',
  'week_start_drift',
] as const

export const FLEETGRAPH_ACTION_OUTCOME_STATUSES = [
  ...FLEETGRAPH_FINDING_ACTION_STATUSES,
  'dismissed',
] as const

const nonEmptyString = z.string().min(1)

export type FleetGraphBranch =
  (typeof FLEETGRAPH_BRANCHES)[number]

export type FleetGraphMode =
  (typeof FLEETGRAPH_MODES)[number]

export type FleetGraphOutcome =
  (typeof FLEETGRAPH_OUTCOMES)[number]

export type FleetGraphTrigger =
  (typeof FLEETGRAPH_TRIGGERS)[number]

export type FleetGraphRunContext =
  (typeof FLEETGRAPH_RUN_CONTEXTS)[number]

export type FleetGraphScenario =
  (typeof FLEETGRAPH_SCENARIOS)[number]

export type FleetGraphActionOutcomeStatus =
  (typeof FLEETGRAPH_ACTION_OUTCOME_STATUSES)[number]

export const FleetGraphScenarioResultSchema = z.object({
  branch: z.enum(FLEETGRAPH_BRANCHES),
  documentId: nonEmptyString.optional(),
  documentType: nonEmptyString.optional(),
  evidence: z.array(nonEmptyString).default([]),
  findingId: nonEmptyString.optional(),
  findingKey: nonEmptyString.optional(),
  metadata: z.record(z.unknown()).default({}),
  recommendedAction: FleetGraphRequestedActionSchema.optional(),
  scenario: z.enum(FLEETGRAPH_SCENARIOS),
  score: z.number(),
  summary: nonEmptyString.optional(),
  title: nonEmptyString.optional(),
  tracePublicUrl: nonEmptyString.optional(),
  traceRunId: nonEmptyString.optional(),
}).strict()

export const FleetGraphActionOutcomeSchema = z.object({
  message: nonEmptyString,
  resultStatusCode: z.number().int().positive().optional(),
  status: z.enum(FLEETGRAPH_ACTION_OUTCOME_STATUSES),
}).strict()

export const FleetGraphRuntimeInputSchema = z.object({
  approvalRequired: z.boolean().default(false),
  candidateCount: z.number().int().nonnegative().default(0),
  contextKind: z.enum(FLEETGRAPH_RUN_CONTEXTS),
  documentId: nonEmptyString.optional(),
  documentTitle: z.string().optional(),
  documentType: nonEmptyString.optional(),
  findingId: nonEmptyString.optional(),
  hasError: z.boolean().default(false),
  mode: z.enum(FLEETGRAPH_MODES),
  requestedAction: z.unknown().optional(),
  routeSurface: nonEmptyString.optional(),
  threadId: nonEmptyString,
  trigger: z.enum(FLEETGRAPH_TRIGGERS),
  workspaceId: nonEmptyString,
})

export const FleetGraphStateSchema = FleetGraphRuntimeInputSchema.extend({
  actionOutcome: FleetGraphActionOutcomeSchema.optional(),
  activeScenario: z.enum(FLEETGRAPH_SCENARIOS).optional(),
  // On-demand analysis fields (optional so parseState doesn't throw)
  context: z.unknown().optional(),
  analysisFindings: z.unknown().optional(),
  analysisText: z.unknown().optional(),
  contextSummary: z.unknown().optional(),
  conversationHistory: z.unknown().optional(),
  deeperContextHint: z.unknown().optional(),
  fetchedData: z.unknown().optional(),
  needsDeeperContext: z.unknown().optional(),
  pendingAction: z.unknown().optional(),
  turnCount: z.unknown().optional(),
  userMessage: z.unknown().optional(),
  branch: z.enum(FLEETGRAPH_BRANCHES),
  checkpointNamespace: z.literal('fleetgraph'),
  outcome: z.enum(FLEETGRAPH_OUTCOMES),
  path: z.array(nonEmptyString).min(3),
  routeSurface: nonEmptyString,
  scenarioResults: z.array(FleetGraphScenarioResultSchema),
  selectedAction: FleetGraphRequestedActionSchema.optional(),
  selectedFindingId: nonEmptyString.optional(),
  selectedScenario: z.enum(FLEETGRAPH_SCENARIOS).optional(),
})

export interface FleetGraphRuntimeInput
  extends Omit<z.infer<typeof FleetGraphRuntimeInputSchema>, 'requestedAction'> {
  requestedAction?: FleetGraphRequestedAction
}

export interface FleetGraphState
  extends Omit<z.infer<typeof FleetGraphStateSchema>, 'requestedAction' | 'selectedAction'> {
  requestedAction?: FleetGraphRequestedAction
  selectedAction?: FleetGraphRequestedAction
}

export interface FleetGraphScenarioResult
  extends z.infer<typeof FleetGraphScenarioResultSchema> {
  recommendedAction?: FleetGraphRequestedAction
}

export function parseFleetGraphRuntimeInput(
  input: unknown
): FleetGraphRuntimeInput {
  const parsed = FleetGraphRuntimeInputSchema.parse(input)
  return {
    ...parsed,
    requestedAction: parsed.requestedAction as FleetGraphRequestedAction | undefined,
  }
}

// ── On-demand analysis types (used by graph nodes and routes) ──

export interface FleetGraphConversationTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface FleetGraphDepthHint {
  ids: string[]
  type: 'assignee_workload' | 'linked_documents' | 'sprint_issues' | 'project_members'
}

export interface FleetGraphAnalysisFinding {
  actionTier: 'A' | 'B' | 'C'
  evidence: string[]
  findingType: string
  proposedAction?: FleetGraphOnDemandActionDraft
  severity: 'info' | 'warning' | 'critical'
  summary: string
  title: string
}

export interface FleetGraphContextEnvelope {
  actorId: string
  documentId: string
  documentTitle: string
  documentType: string
  surface: string
  workspaceId: string
}
