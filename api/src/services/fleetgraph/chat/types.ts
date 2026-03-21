/**
 * FleetGraph Chat Orchestrator Types
 *
 * Chat-specific types for the tool-calling chat runtime.
 * Reuses action/dialog types from the shared registry and
 * finding types from the graph layer.
 */

import type { ZodSchema } from 'zod'

import type {
  FleetGraphActionDraft,
  FleetGraphDialogSpec,
} from '../actions/registry.js'
import type { ReasonedFinding } from '../graph/types-v2.js'

// Re-export for downstream convenience
export type { FleetGraphActionDraft, FleetGraphDialogSpec, ReasonedFinding }

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

export const MAX_TOOL_CALLS_PER_TURN = 20
export const MAX_LLM_ROUNDS_PER_TURN = 5
export const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes
export const DEFAULT_TOKEN_LIMIT = 50_000

// ──────────────────────────────────────────────────────────────────────────────
// Chat Messages (OpenAI-compatible)
// ──────────────────────────────────────────────────────────────────────────────

export interface ChatToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string      // Only for role=tool
  tool_calls?: ChatToolCall[] // Only for role=assistant
}

// ──────────────────────────────────────────────────────────────────────────────
// Session State
// ──────────────────────────────────────────────────────────────────────────────

export interface PendingToolApproval {
  toolCallId: string // OpenAI tool_call.id for response
  actionType: string
  actionDraft: FleetGraphActionDraft
  dialogSpec: FleetGraphDialogSpec
  rationale: string
  evidence: string[]
}

export interface CompletedAction {
  actionType: string
  targetId: string
  outcome: 'success' | 'failure'
  message: string
  completedAt: string
}

export interface ChatSession {
  threadId: string
  workspaceId: string
  actorId: string
  documentId: string
  documentType: string
  messages: ChatMessage[]
  tokenBudget: { used: number; limit: number }
  toolCallCount: number
  pendingApproval: PendingToolApproval | null
  completedActions: CompletedAction[]
  createdAt: string
  lastActiveAt: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ──────────────────────────────────────────────────────────────────────────────

export interface ChatToolDefinition {
  name: string
  category: 'retrieval' | 'action'
  description: string
  parameters: ZodSchema   // For runtime validation
  jsonSchema: object      // For OpenAI tools param
  requiresApproval: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool Execution
// ──────────────────────────────────────────────────────────────────────────────

export interface ChatToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Orchestrator Response
// ──────────────────────────────────────────────────────────────────────────────

export interface ChatTurnResult {
  analysisNarrative: string
  actionDrafts: FleetGraphActionDraft[]
  pendingApproval: PendingToolApproval | null
  reasonedFindings: ReasonedFinding[]
  toolCallsExecuted: number
  llmRoundsUsed: number
}
