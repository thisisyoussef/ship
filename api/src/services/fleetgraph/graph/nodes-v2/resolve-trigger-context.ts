/**
 * resolve_trigger_context - Entry Node
 *
 * Lane: Shared entry (all three lanes start here)
 * Type: Deterministic router
 * LLM: No
 *
 * This node parses the invocation envelope to determine which lane to execute:
 * - mode = "proactive" → fetch_workspace_snapshot
 * - mode = "on_demand" → fetch_actor_and_roles
 * - mode = "event_driven" → fetch_dirty_context
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import { v4 as uuidv4 } from 'uuid'

import type {
  FleetGraphV2Mode,
  FleetGraphV2TriggerType,
  FleetGraphV2DocumentType,
  FleetGraphV2DirtyWriteType,
  TraceMetadata,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Input Payload Types
// ──────────────────────────────────────────────────────────────────────────────

export interface ResolveTriggerContextInput {
  // Required
  workspaceId: string
  threadId: string

  // Mode determination
  triggerType: FleetGraphV2TriggerType
  triggerSource?: string

  // Actor context (null for proactive sweeps)
  actorId?: string | null
  viewerUserId?: string | null

  // Surface context (on-demand and event-driven)
  documentId?: string | null
  documentType?: FleetGraphV2DocumentType | null
  activeTab?: string | null
  nestedPath?: string | null
  projectContextId?: string | null
  selectedActionId?: string | null
  userQuestion?: string | null

  // Event context (event-driven only)
  dirtyEntityId?: string | null
  dirtyEntityType?: string | null
  dirtyWriteType?: FleetGraphV2DirtyWriteType | null
  dirtyCoalescedIds?: string[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Mode Resolution Logic
// ──────────────────────────────────────────────────────────────────────────────

function determineMode(triggerType: FleetGraphV2TriggerType): FleetGraphV2Mode {
  switch (triggerType) {
    case 'sweep':
      return 'proactive'
    case 'user_chat':
      return 'on_demand'
    case 'enqueue':
      return 'event_driven'
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = triggerType
      throw new Error(`Unknown trigger type: ${_exhaustive}`)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean
  fallbackReason?: string
}

function validateInput(
  input: ResolveTriggerContextInput,
  mode: FleetGraphV2Mode
): ValidationResult {
  // Basic validation
  if (!input.workspaceId) {
    return { valid: false, fallbackReason: 'Missing workspaceId' }
  }

  if (!input.threadId) {
    return { valid: false, fallbackReason: 'Missing threadId' }
  }

  // Mode-specific validation
  switch (mode) {
    case 'proactive':
      // No additional requirements
      break

    case 'on_demand':
      if (!input.documentId) {
        return { valid: false, fallbackReason: 'On-demand mode requires documentId' }
      }
      if (!input.actorId) {
        return { valid: false, fallbackReason: 'On-demand mode requires actorId' }
      }
      break

    case 'event_driven':
      if (!input.dirtyEntityId) {
        return { valid: false, fallbackReason: 'Event-driven mode requires dirtyEntityId' }
      }
      if (!input.dirtyEntityType) {
        return { valid: false, fallbackReason: 'Event-driven mode requires dirtyEntityType' }
      }
      break
  }

  return { valid: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Entry node that parses the invocation envelope and routes to the appropriate lane.
 *
 * @param state - Current graph state (may have partial input from invoke)
 * @returns State update with entry context populated
 */
export function resolveTriggerContext(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  const runId = uuidv4()
  const startedAt = new Date().toISOString()

  // Extract input from state (populated by runtime.invoke)
  const input: ResolveTriggerContextInput = {
    workspaceId: state.workspaceId,
    threadId: state.threadId,
    triggerType: state.triggerType,
    triggerSource: state.triggerSource,
    actorId: state.actorId,
    viewerUserId: state.viewerUserId,
    documentId: state.documentId,
    documentType: state.documentType,
    activeTab: state.activeTab,
    nestedPath: state.nestedPath,
    projectContextId: state.projectContextId,
    selectedActionId: state.selectedActionId,
    userQuestion: state.userQuestion,
    dirtyEntityId: state.dirtyEntityId,
    dirtyEntityType: state.dirtyEntityType,
    dirtyWriteType: state.dirtyWriteType as FleetGraphV2DirtyWriteType | null,
    dirtyCoalescedIds: state.dirtyCoalescedIds,
  }

  // Determine mode from trigger type
  const mode = determineMode(input.triggerType)

  // Validate input
  const validation = validateInput(input, mode)

  // Build initial trace metadata
  const traceMetadata: TraceMetadata = {
    runId,
    workspaceId: input.workspaceId,
    triggerType: input.triggerType,
    triggerSource: input.triggerSource ?? 'unknown',
    mode,
    startedAt,
  }

  // Handle validation failure
  if (!validation.valid) {
    return {
      runId,
      mode,
      branch: 'fallback',
      fallbackReason: validation.fallbackReason ?? 'Validation failed',
      traceMetadata,
      path: ['resolve_trigger_context'],
    }
  }

  // Return state update with entry context
  return {
    runId,
    mode,
    triggerType: input.triggerType,
    triggerSource: input.triggerSource ?? 'unknown',
    workspaceId: input.workspaceId,
    actorId: input.actorId ?? null,
    viewerUserId: input.viewerUserId ?? input.actorId ?? null,
    documentId: input.documentId ?? null,
    documentType: input.documentType ?? null,
    activeTab: input.activeTab ?? null,
    nestedPath: input.nestedPath ?? null,
    projectContextId: input.projectContextId ?? null,
    selectedActionId: input.selectedActionId ?? null,
    userQuestion: input.userQuestion ?? null,
    dirtyEntityId: input.dirtyEntityId ?? null,
    dirtyEntityType: input.dirtyEntityType ?? null,
    dirtyWriteType: input.dirtyWriteType ?? null,
    dirtyCoalescedIds: input.dirtyCoalescedIds ?? [],
    traceMetadata,
    path: ['resolve_trigger_context'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function (for graph edges)
// ──────────────────────────────────────────────────────────────────────────────

export type ResolveTriggerContextRoute =
  | 'fetch_workspace_snapshot'
  | 'fetch_actor_and_roles'
  | 'fetch_dirty_context'
  | 'fallback'

/**
 * Determines the next node based on the resolved mode.
 */
export function routeFromTriggerContext(
  state: FleetGraphStateV2
): ResolveTriggerContextRoute {
  // Validation failure routes to fallback
  if (state.branch === 'fallback') {
    return 'fallback'
  }

  // Route based on mode
  switch (state.mode) {
    case 'proactive':
      return 'fetch_workspace_snapshot'
    case 'on_demand':
      return 'fetch_actor_and_roles'
    case 'event_driven':
      return 'fetch_dirty_context'
    default:
      return 'fallback'
  }
}
