/**
 * FleetGraph Chat Policy Layer
 *
 * Auth, budget, and rate-limit checks that gate each turn and tool call.
 */

import type { ChatSession } from './types.js'
import { MAX_TOOL_CALLS_PER_TURN } from './types.js'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface PolicyCheckResult {
  allowed: boolean
  reason?: string
}

export interface PolicyContext {
  session: ChatSession
  actorId: string
  workspaceId: string
}

// Lifetime tool call limit (3x the per-turn limit)
const LIFETIME_TOOL_CALL_LIMIT = MAX_TOOL_CALLS_PER_TURN * 3

// ──────────────────────────────────────────────────────────────────────────────
// Turn Policy
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Check if a new turn is allowed for this session.
 *
 * Verifies:
 * - Actor matches the session owner
 * - Workspace matches the session workspace
 * - Token budget has not been exhausted
 * - No pending approval blocks the turn (only approval/dismiss allowed)
 */
export function checkTurnPolicy(ctx: PolicyContext): PolicyCheckResult {
  const { session, actorId, workspaceId } = ctx

  if (actorId !== session.actorId) {
    return { allowed: false, reason: 'Actor does not match session owner.' }
  }

  if (workspaceId !== session.workspaceId) {
    return { allowed: false, reason: 'Workspace does not match session.' }
  }

  if (session.tokenBudget.used >= session.tokenBudget.limit) {
    return {
      allowed: false,
      reason: 'Token budget exhausted for this session. Start a new chat.',
    }
  }

  if (session.pendingApproval !== null) {
    return {
      allowed: false,
      reason:
        'An action is pending approval. Please approve or dismiss it before sending a new message.',
    }
  }

  return { allowed: true }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool Call Policy
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Check if a tool call is allowed for this session.
 *
 * Verifies:
 * - Actor matches the session owner
 * - Workspace matches the session workspace
 * - Lifetime tool call count has not been exceeded
 * - Token budget has not been exhausted
 */
export function checkToolCallPolicy(ctx: PolicyContext): PolicyCheckResult {
  const { session, actorId, workspaceId } = ctx

  if (actorId !== session.actorId) {
    return { allowed: false, reason: 'Actor does not match session owner.' }
  }

  if (workspaceId !== session.workspaceId) {
    return { allowed: false, reason: 'Workspace does not match session.' }
  }

  if (session.toolCallCount >= LIFETIME_TOOL_CALL_LIMIT) {
    return {
      allowed: false,
      reason: `Lifetime tool call limit (${LIFETIME_TOOL_CALL_LIMIT}) reached. Start a new chat.`,
    }
  }

  if (session.tokenBudget.used >= session.tokenBudget.limit) {
    return {
      allowed: false,
      reason: 'Token budget exhausted for this session.',
    }
  }

  return { allowed: true }
}
