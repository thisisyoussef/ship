/**
 * FleetGraph V2 State Schema - Three-Lane Architecture
 *
 * This file defines the LangGraph state annotation for the three-lane graph
 * as specified in docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md
 *
 * Every node reads from and writes to this single FleetGraphStateV2 object.
 * This is the run-local state, not the persistent ledger.
 */

import { Annotation } from '@langchain/langgraph'

import type {
  ActorProfile,
  ActionResult,
  CandidateFinding,
  DedupeHit,
  FetchError,
  FleetGraphActionDraft,
  FleetGraphConversationTurn,
  FleetGraphDialogSubmission,
  FleetGraphSurfaceTarget,
  FleetGraphV2Branch,
  FleetGraphV2DocumentType,
  FleetGraphV2FallbackStage,
  FleetGraphV2Mode,
  FleetGraphV2RoleLens,
  FleetGraphV2ApprovalDecision,
  FleetGraphV2TriggerType,
  IssueCluster,
  NormalizedShipGraph,
  PendingApproval,
  ProgramCluster,
  ProjectCluster,
  ProposedAction,
  ReasonedFinding,
  ResponsePayload,
  RoleSignal,
  ScoredFinding,
  ShipAccountabilityItem,
  ShipDocument,
  ShipIssue,
  ShipPerson,
  ShipProject,
  ShipStandup,
  ShipWeek,
  SuspectEntity,
  TraceMetadata,
  WeekCluster,
} from './types-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Reducer Functions
// ──────────────────────────────────────────────────────────────────────────────

function replaceValue<T>(defaultValue: T) {
  return Annotation<T>({
    default: () => defaultValue,
    reducer: (_left, right) => right,
  })
}

function appendArray<T>() {
  return Annotation<T[], T | T[]>({
    default: () => [],
    reducer: (left, right) =>
      left.concat(Array.isArray(right) ? right : [right]),
  })
}

function appendPath() {
  return Annotation<string[], string | string[]>({
    default: () => [],
    reducer: (left, right) =>
      left.concat(Array.isArray(right) ? right : [right]),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// FleetGraph V2 State Annotation
// ──────────────────────────────────────────────────────────────────────────────

export const FleetGraphStateV2Annotation = Annotation.Root({
  // ════════════════════════════════════════════════════════════════════════════
  // Entry context (set by resolve_trigger_context)
  // ════════════════════════════════════════════════════════════════════════════

  /** Unique identifier for this run (UUID v4) */
  runId: replaceValue<string>(''),

  /** Which lane this run is executing in */
  mode: replaceValue<FleetGraphV2Mode>('proactive'),

  /** What initiated this run */
  triggerType: replaceValue<FleetGraphV2TriggerType>('sweep'),

  /** Route path, cron id, or queue key that triggered the run */
  triggerSource: replaceValue<string>(''),

  /** Workspace this run is scoped to */
  workspaceId: replaceValue<string>(''),

  /** Actor who triggered the run (null for proactive sweeps) */
  actorId: replaceValue<string | null>(null),

  /** The human who will see results */
  viewerUserId: replaceValue<string | null>(null),

  // ════════════════════════════════════════════════════════════════════════════
  // Surface context (on-demand and event-driven only)
  // ════════════════════════════════════════════════════════════════════════════

  /** Current document being viewed (on-demand) or affected (event) */
  documentId: replaceValue<string | null>(null),

  /** Type of the current document */
  documentType: replaceValue<FleetGraphV2DocumentType | null>(null),

  /** Active tab within the document view */
  activeTab: replaceValue<string | null>(null),

  /** Nested path within the document (e.g., specific section) */
  nestedPath: replaceValue<string | null>(null),

  /** Inherited project context from the document */
  projectContextId: replaceValue<string | null>(null),

  /** User's question (on-demand only) */
  userQuestion: replaceValue<string | null>(null),

  /** Explicit action selected for native review/apply flows */
  selectedActionId: replaceValue<string | null>(null),

  /** Cluster targets resolved from the current surface */
  surfaceTargets: replaceValue<FleetGraphSurfaceTarget[]>([]),

  /** Resolved issue target for compound surface routing */
  surfaceIssueId: replaceValue<string | null>(null),

  /** Resolved week target for compound surface routing */
  surfaceWeekId: replaceValue<string | null>(null),

  /** Resolved project target for compound surface routing */
  surfaceProjectId: replaceValue<string | null>(null),

  /** Resolved program target for compound surface routing */
  surfaceProgramId: replaceValue<string | null>(null),

  // ════════════════════════════════════════════════════════════════════════════
  // Event context (event-driven only)
  // ════════════════════════════════════════════════════════════════════════════

  /** ID of the entity that was modified */
  dirtyEntityId: replaceValue<string | null>(null),

  /** Type of the dirty entity */
  dirtyEntityType: replaceValue<string | null>(null),

  /** Type of write that occurred (e.g., "issue.state_change", "week.start") */
  dirtyWriteType: replaceValue<string | null>(null),

  /** Other dirty entities merged in debounce window */
  dirtyCoalescedIds: replaceValue<string[]>([]),

  // ════════════════════════════════════════════════════════════════════════════
  // Raw fetch payloads
  // ════════════════════════════════════════════════════════════════════════════

  /** All projects in workspace (proactive sweep) */
  rawProjects: replaceValue<ShipProject[]>([]),

  /** All weeks in workspace (proactive sweep) */
  rawWeeks: replaceValue<ShipWeek[]>([]),

  /** All issues in workspace (proactive sweep) */
  rawIssues: replaceValue<ShipIssue[]>([]),

  /** All people in workspace */
  rawPeople: replaceValue<ShipPerson[]>([]),

  /** All accountability items in workspace */
  rawAccountabilityItems: replaceValue<ShipAccountabilityItem[]>([]),

  /** Today's standups across the workspace (for missing_standup detection) */
  rawTodayStandups: replaceValue<ShipStandup[]>([]),

  /** Primary document being analyzed (on-demand/event) */
  rawPrimaryDocument: replaceValue<ShipDocument | null>(null),

  /** Issue cluster data */
  rawIssueCluster: replaceValue<IssueCluster | null>(null),

  /** Week cluster data */
  rawWeekCluster: replaceValue<WeekCluster | null>(null),

  /** Project cluster data */
  rawProjectCluster: replaceValue<ProjectCluster | null>(null),

  /** Program cluster data */
  rawProgramCluster: replaceValue<ProgramCluster | null>(null),

  // ════════════════════════════════════════════════════════════════════════════
  // Actor context
  // ════════════════════════════════════════════════════════════════════════════

  /** Resolved actor profile */
  actorProfile: replaceValue<ActorProfile | null>(null),

  /** Determined role perspective for reasoning */
  roleLens: replaceValue<FleetGraphV2RoleLens>('unknown'),

  /** Stack of signals used to derive role_lens */
  roleDerivationStack: replaceValue<RoleSignal[]>([]),

  // ════════════════════════════════════════════════════════════════════════════
  // Proactive lane: suspect entities
  // ════════════════════════════════════════════════════════════════════════════

  /** Entities that passed deterministic threshold checks */
  suspectEntities: replaceValue<SuspectEntity[]>([]),

  // ════════════════════════════════════════════════════════════════════════════
  // Normalized graph
  // ════════════════════════════════════════════════════════════════════════════

  /** Unified graph representation of Ship state */
  normalizedContext: replaceValue<NormalizedShipGraph | null>(null),

  // ════════════════════════════════════════════════════════════════════════════
  // Dedupe pre-check
  // ════════════════════════════════════════════════════════════════════════════

  /** Findings already active and within cooldown */
  dedupeHits: replaceValue<DedupeHit[]>([]),

  /** Fingerprints suppressed by dedupe */
  suppressedFingerprints: replaceValue<string[]>([]),

  // ════════════════════════════════════════════════════════════════════════════
  // Scoring
  // ════════════════════════════════════════════════════════════════════════════

  /** Pre-score candidate findings */
  candidateFindings: replaceValue<CandidateFinding[]>([]),

  /** Post-score findings with composite scores */
  scoredFindings: replaceValue<ScoredFinding[]>([]),

  /** Cache of scores by fingerprint (persists across thread invocations) */
  scoreCache: replaceValue<Record<string, number>>({}),

  // ════════════════════════════════════════════════════════════════════════════
  // Branch decision
  // ════════════════════════════════════════════════════════════════════════════

  /** Which branch this run will take */
  branch: replaceValue<FleetGraphV2Branch>('fallback'),

  // ════════════════════════════════════════════════════════════════════════════
  // Reasoning (only populated when branch != quiet)
  // ════════════════════════════════════════════════════════════════════════════

  /** LLM-reasoned findings with explanations */
  reasonedFindings: replaceValue<ReasonedFinding[] | null>(null),

  /** Actions proposed by the LLM */
  proposedActions: replaceValue<ProposedAction[]>([]),

  /** Shared action-registry drafts derived from proposed actions */
  actionDrafts: replaceValue<FleetGraphActionDraft[]>([]),

  /** Primary narrative for on-demand chat responses */
  analysisNarrative: replaceValue<string | null>(null),

  /** Multi-turn assistant/user transcript */
  conversationHistory: replaceValue<FleetGraphConversationTurn[]>([]),

  /** Summary of older turns once the transcript gets long */
  contextSummary: replaceValue<string | null>(null),

  /** Number of user/assistant exchanges on this thread */
  turnCount: replaceValue<number>(0),

  // ════════════════════════════════════════════════════════════════════════════
  // HITL state
  // ════════════════════════════════════════════════════════════════════════════

  /** Currently pending approval (set by approval_interrupt) */
  pendingApproval: replaceValue<PendingApproval | null>(null),

  /** User's decision on pending approval */
  approvalDecision: replaceValue<FleetGraphV2ApprovalDecision | null>(null),

  /** Typed dialog values submitted with approval */
  dialogSubmission: replaceValue<FleetGraphDialogSubmission | null>(null),

  /** Result of executing the confirmed action */
  actionResult: replaceValue<ActionResult | null>(null),

  // ════════════════════════════════════════════════════════════════════════════
  // Output
  // ════════════════════════════════════════════════════════════════════════════

  /** Final response payload to deliver */
  responsePayload: replaceValue<ResponsePayload | null>(null),

  // ════════════════════════════════════════════════════════════════════════════
  // Error tracking
  // ════════════════════════════════════════════════════════════════════════════

  /** Whether this run has incomplete data */
  partialData: replaceValue<boolean>(false),

  /** Errors encountered during fetches */
  fetchErrors: appendArray<FetchError>(),

  /** Why this run fell back to degraded mode */
  fallbackReason: replaceValue<string | null>(null),

  /** Which fallback bucket this run entered */
  fallbackStage: replaceValue<FleetGraphV2FallbackStage | null>(null),

  // ════════════════════════════════════════════════════════════════════════════
  // Trace metadata
  // ════════════════════════════════════════════════════════════════════════════

  /** Metadata for LangSmith tracing */
  traceMetadata: replaceValue<TraceMetadata>({
    runId: '',
    workspaceId: '',
    triggerType: 'sweep',
    triggerSource: '',
    mode: 'proactive',
    startedAt: new Date().toISOString(),
  }),

  // ════════════════════════════════════════════════════════════════════════════
  // Execution path tracking (for debugging and trace visualization)
  // ════════════════════════════════════════════════════════════════════════════

  /** Ordered list of nodes this run has passed through */
  path: appendPath(),

  /** Thread ID for LangGraph checkpointing */
  threadId: replaceValue<string>(''),
})

// ──────────────────────────────────────────────────────────────────────────────
// Type Exports
// ──────────────────────────────────────────────────────────────────────────────

export type FleetGraphStateV2 = typeof FleetGraphStateV2Annotation.State

/**
 * Partial state update type for node return values.
 * Nodes should return only the fields they want to update.
 */
export type FleetGraphStateV2Update = Partial<FleetGraphStateV2>
