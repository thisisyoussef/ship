/**
 * FleetGraph V2 Types - Three-Lane Architecture
 *
 * This file defines all types for the three-lane graph architecture
 * as specified in docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md
 */

import { z } from 'zod'

import {
  FleetGraphActionDraftSchema,
  FleetGraphDialogSpecSchema,
  FleetGraphDialogSubmissionSchema,
  type FleetGraphActionDraft,
  type FleetGraphActionType,
  type FleetGraphDialogSpec,
  type FleetGraphDialogSubmission,
} from '../actions/registry.js'

export type {
  FleetGraphActionDraft,
  FleetGraphActionType,
  FleetGraphDialogSpec,
  FleetGraphDialogSubmission,
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

export const FLEETGRAPH_V2_MODES = [
  'proactive',
  'on_demand',
  'event_driven',
] as const

export const FLEETGRAPH_V2_TRIGGER_TYPES = [
  'sweep',
  'user_chat',
  'enqueue',
] as const

export const FLEETGRAPH_V2_BRANCHES = [
  'quiet',
  'advisory',
  'action_required',
  'fallback',
] as const

export const FLEETGRAPH_V2_FALLBACK_STAGES = [
  'input',
  'fetch',
  'scoring',
] as const

export const FLEETGRAPH_V2_SURFACE_TARGETS = [
  'fetch_issue_cluster',
  'fetch_week_cluster',
  'fetch_project_cluster',
  'fetch_program_cluster',
] as const

export const FLEETGRAPH_V2_DOCUMENT_TYPES = [
  'issue',
  'sprint',
  'project',
  'program',
  'weekly_plan',
  'weekly_retro',
  'wiki',
  'person',
  'standup',
] as const

export const FLEETGRAPH_V2_ROLE_LENSES = [
  'director',
  'pm',
  'engineer',
  'unknown',
] as const

export const FLEETGRAPH_V2_APPROVAL_DECISIONS = [
  'approved',
  'dismissed',
  'snoozed',
] as const

export const FLEETGRAPH_V2_SUSPECT_TYPES = [
  'week_start_drift',
  'empty_active_week',
  'missing_standup',
  'approval_gap',
  'deadline_risk',
  'workload_imbalance',
  'blocker_aging',
] as const

export const FLEETGRAPH_V2_DIRTY_WRITE_TYPES = [
  'issue.state_change',
  'issue.reassignment',
  'week.start',
  'week.plan_submitted',
  'project.approval_action',
  'standup.created',
] as const

// ──────────────────────────────────────────────────────────────────────────────
// Base Types
// ──────────────────────────────────────────────────────────────────────────────

export type FleetGraphV2Mode = (typeof FLEETGRAPH_V2_MODES)[number]
export type FleetGraphV2TriggerType = (typeof FLEETGRAPH_V2_TRIGGER_TYPES)[number]
export type FleetGraphV2Branch = (typeof FLEETGRAPH_V2_BRANCHES)[number]
export type FleetGraphV2FallbackStage = (typeof FLEETGRAPH_V2_FALLBACK_STAGES)[number]
export type FleetGraphSurfaceTarget = (typeof FLEETGRAPH_V2_SURFACE_TARGETS)[number]
export type FleetGraphV2DocumentType = (typeof FLEETGRAPH_V2_DOCUMENT_TYPES)[number]
export type FleetGraphV2RoleLens = (typeof FLEETGRAPH_V2_ROLE_LENSES)[number]
export type FleetGraphV2ApprovalDecision = (typeof FLEETGRAPH_V2_APPROVAL_DECISIONS)[number]
export type FleetGraphV2SuspectType = (typeof FLEETGRAPH_V2_SUSPECT_TYPES)[number]
export type FleetGraphV2DirtyWriteType = (typeof FLEETGRAPH_V2_DIRTY_WRITE_TYPES)[number]

// ──────────────────────────────────────────────────────────────────────────────
// Ship Entity Types (raw fetch payloads)
// ──────────────────────────────────────────────────────────────────────────────

export interface ShipProject {
  id: string
  title: string
  status: string
  targetDate?: string
  ownerId?: string
  accountableId?: string
  properties?: Record<string, unknown>
}

export interface ShipWeek {
  id: string
  title: string
  status: 'planning' | 'active' | 'completed' | 'archived'
  sprintStartDate?: string
  sprintEndDate?: string
  ownerId?: string
  projectId?: string
  properties?: Record<string, unknown>
}

export interface ShipIssue {
  id: string
  title: string
  state: string
  priority?: string
  assigneeId?: string
  estimate?: number
  blockerText?: string
  lastUpdatedAt?: string
  sprintId?: string
  projectId?: string
  properties?: Record<string, unknown>
}

export interface ShipPerson {
  id: string
  name: string
  email?: string
  role?: string
  reportsTo?: string
  properties?: Record<string, unknown>
}

export interface ShipAccountabilityItem {
  id: string
  entityId: string
  entityType: string
  accountableId: string
  responsibleId?: string
  consultedIds?: string[]
  informedIds?: string[]
}

export interface ShipDocument {
  belongs_to?: Array<{
    id: string
    title?: string
    type: string
  }>
  id: string
  title: string
  documentType: string
  content?: unknown
  properties?: Record<string, unknown>
  ownerId?: string
  createdAt?: string
  updatedAt?: string
}

export interface ShipStandup {
  id: string
  title: string
  authorId: string
  date: string // YYYY-MM-DD format
  sprintId?: string
  createdAt?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Cluster Types (fetched document groups)
// ──────────────────────────────────────────────────────────────────────────────

export interface IssueCluster {
  issue: ShipIssue
  history?: unknown[]
  iterations?: unknown[]
  children?: ShipIssue[]
  comments?: unknown[]
  relatedPeople?: ShipPerson[]
}

export interface WeekCluster {
  week: ShipWeek
  issues?: ShipIssue[]
  standups?: unknown[]
  review?: unknown
  scopeChanges?: unknown[]
  relatedPeople?: ShipPerson[]
}

export interface ProjectCluster {
  project: ShipProject
  issues?: ShipIssue[]
  weeks?: ShipWeek[]
  retro?: unknown
  activity?: unknown[]
  relatedPeople?: ShipPerson[]
}

export interface ProgramCluster {
  program: ShipDocument
  projects?: ShipProject[]
  weeks?: ShipWeek[]
  relatedPeople?: ShipPerson[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Actor and Role Context
// ──────────────────────────────────────────────────────────────────────────────

export interface RoleSignal {
  priority: number
  signal: string
  source: 'auth' | 'functional' | 'raci' | 'manager_chain'
  lens: FleetGraphV2RoleLens
}

export interface ActorProfile {
  id: string
  name: string
  email?: string
  role?: string
  isAdmin: boolean
  projectMemberships: string[]
  programMemberships: string[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Normalized Graph Types
// ──────────────────────────────────────────────────────────────────────────────

export type NormalizedNodeType = 'project' | 'week' | 'issue' | 'person' | 'program'
export type NormalizedEdgeType =
  | 'owns'
  | 'assigned_to'
  | 'belongs_to_project'
  | 'belongs_to_week'
  | 'accountable_for'
  | 'reports_to'

export interface NormalizedNode {
  id: string
  type: NormalizedNodeType
  title: string
  data: Record<string, unknown>
}

export interface NormalizedEdge {
  from: string
  to: string
  type: NormalizedEdgeType
}

export interface EntityAdjacency {
  entityId: string
  parents: string[]
  children: string[]
  project?: string
  sprint?: string
  program?: string
  assignees: string[]
  owner?: string
  accountable?: string
}

export interface TemporalEnrichment {
  daysUntilTargetDate?: number
  hoursSinceLastUpdate?: number
  businessDaysSinceSubmission?: number
  isBusinessDay: boolean
  workspaceTimezone: string
}

export interface NormalizedShipGraph {
  nodes: NormalizedNode[]
  edges: NormalizedEdge[]
  adjacency: Record<string, EntityAdjacency>
  temporal: Record<string, TemporalEnrichment>
  resolvedPersons: Record<string, ShipPerson>
}

// ──────────────────────────────────────────────────────────────────────────────
// Suspect Entity Types (proactive lane)
// ──────────────────────────────────────────────────────────────────────────────

export interface SuspectEntity {
  type: FleetGraphV2SuspectType
  entityId: string
  entityType: string
  ownerId?: string
  weekId?: string
  projectId?: string
  personId?: string
  metadata?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────────────────────
// Dedupe Types
// ──────────────────────────────────────────────────────────────────────────────

export interface DedupeHit {
  fingerprint: string
  findingType: string
  entityId: string
  lastNotifiedAt: string
  cooldownUntil: string
  snoozedUntil?: string
  dismissedUntil?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Scoring Types
// ──────────────────────────────────────────────────────────────────────────────

export interface ScoreDimensions {
  urgency: number      // 0-100, weight 0.30
  impact: number       // 0-100, weight 0.25
  actionability: number // 0-100, weight 0.25
  confidence: number   // 0-100, weight 0.20
}

export interface CandidateFinding {
  fingerprint: string
  findingType: FleetGraphV2SuspectType
  targetEntityId: string
  targetEntityType: string
  severity: 'info' | 'warning' | 'critical'
  rawData: Record<string, unknown>
}

export interface ScoredFinding extends CandidateFinding {
  dimensions: ScoreDimensions
  compositeScore: number
  suppressed: boolean
  suppressReason?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Reasoning Types (LLM output)
// ──────────────────────────────────────────────────────────────────────────────

export interface ReasonedFinding {
  fingerprint: string
  findingType: FleetGraphV2SuspectType
  title: string
  explanation: string
  evidence: string[]
  targetEntity: {
    id: string
    type: string
    name: string
  }
  affectedPerson?: {
    id: string
    name: string
  }
  deadline?: string
  severity: 'info' | 'warning' | 'critical'
}

export interface ProposedAction {
  findingFingerprint: string
  actionType?: FleetGraphActionType
  label: string
  endpoint: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    path: string
    body?: Record<string, unknown>
  }
  targetEntity: {
    id: string
    type: string
    name: string
  }
  requiresApproval: boolean
  rollbackFeasibility: 'easy' | 'moderate' | 'difficult' | 'impossible'
  safetyRationale: string
}

// ──────────────────────────────────────────────────────────────────────────────
// HITL Types (approval interrupt)
// ──────────────────────────────────────────────────────────────────────────────

export interface PendingApproval {
  id: string
  actionDraft: FleetGraphActionDraft
  dialogSpec: FleetGraphDialogSpec
  proposedAction: ProposedAction
  reasonedFinding: ReasonedFinding
  validationError?: string
  previewHtml?: string
  createdAt: string
}

export interface ActionResult {
  success: boolean
  endpoint: string
  method?: string
  path?: string
  statusCode: number
  responseBody?: unknown
  errorMessage?: string
  executedAt: string
}

export interface FleetGraphConversationTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Response Payload Types
// ──────────────────────────────────────────────────────────────────────────────

export interface InsightCard {
  id: string
  findingFingerprint: string
  title: string
  body: string
  severityBadge: 'info' | 'warning' | 'critical'
  targetPerson?: { id: string; name: string }
  actionButtons: Array<{
    label: string
    action: 'snooze' | 'dismiss' | 'view_evidence' | 'apply'
    requiresApproval?: boolean
  }>
}

export interface ChatAnswer {
  text: string
  entityLinks: Array<{ id: string; type: string; name: string }>
  suggestedNextSteps: string[]
  relatedContextSummary?: string
}

export type ResponsePayload =
  | { type: 'empty' }
  | { type: 'insight_cards'; cards: InsightCard[] }
  | { type: 'chat_answer'; answer: ChatAnswer }
  | { type: 'degraded'; disclaimer: string; partialAnswer?: ChatAnswer }

// ──────────────────────────────────────────────────────────────────────────────
// Fetch Error Types
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchError {
  endpoint: string
  statusCode?: number
  message: string
  retryCount: number
  timestamp: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Trace Metadata Types
// ──────────────────────────────────────────────────────────────────────────────

export interface TraceMetadata {
  runId: string
  workspaceId: string
  triggerType: FleetGraphV2TriggerType
  triggerSource: string
  mode: FleetGraphV2Mode
  branch?: FleetGraphV2Branch
  fallbackStage?: FleetGraphV2FallbackStage
  candidateCount?: number
  findingTypes?: FleetGraphV2SuspectType[]
  dedupeHit?: boolean
  approvalRequired?: boolean
  shipApiCalls?: number
  llmProvider?: string
  llmModel?: string
  startedAt: string
  completedAt?: string
}

export const FleetGraphConversationTurnSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  timestamp: z.string().datetime(),
}).strict()

export const FleetGraphV2ResumeInputSchema = z.object({
  actionId: z.string().min(1).optional(),
  decision: z.enum(FLEETGRAPH_V2_APPROVAL_DECISIONS),
  dialogSubmission: FleetGraphDialogSubmissionSchema.optional(),
  snoozeMinutes: z.number().int().positive().max(7 * 24 * 60).optional(),
}).strict()

export type FleetGraphV2ResumeInput = z.infer<typeof FleetGraphV2ResumeInputSchema>

// ──────────────────────────────────────────────────────────────────────────────
// Zod Schemas for Validation
// ──────────────────────────────────────────────────────────────────────────────

const nonEmptyString = z.string().min(1)

export const FleetGraphV2RuntimeInputSchema = z.object({
  // Entry context
  mode: z.enum(FLEETGRAPH_V2_MODES),
  triggerType: z.enum(FLEETGRAPH_V2_TRIGGER_TYPES),
  triggerSource: nonEmptyString,
  workspaceId: nonEmptyString,
  actorId: nonEmptyString.nullable().default(null),
  viewerUserId: nonEmptyString.nullable().default(null),

  // Surface context (on-demand and event-driven)
  documentId: nonEmptyString.nullable().default(null),
  documentType: z.enum(FLEETGRAPH_V2_DOCUMENT_TYPES).nullable().default(null),
  activeTab: nonEmptyString.nullable().default(null),
  nestedPath: nonEmptyString.nullable().default(null),
  projectContextId: nonEmptyString.nullable().default(null),
  userQuestion: nonEmptyString.nullable().default(null),
  selectedActionId: nonEmptyString.nullable().default(null),

  // Event context (event-driven only)
  dirtyEntityId: nonEmptyString.nullable().default(null),
  dirtyEntityType: nonEmptyString.nullable().default(null),
  dirtyWriteType: z.enum(FLEETGRAPH_V2_DIRTY_WRITE_TYPES).nullable().default(null),
  dirtyCoalescedIds: z.array(nonEmptyString).default([]),

  // Thread management
  threadId: nonEmptyString,
})

export type FleetGraphV2RuntimeInput = z.infer<typeof FleetGraphV2RuntimeInputSchema>

export function parseFleetGraphV2RuntimeInput(input: unknown): FleetGraphV2RuntimeInput {
  return FleetGraphV2RuntimeInputSchema.parse(input)
}

export function parseFleetGraphV2ResumeInput(input: unknown): FleetGraphV2ResumeInput {
  return FleetGraphV2ResumeInputSchema.parse(input)
}
