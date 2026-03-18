/**
 * fallback - Shared Pipeline (Error Handler)
 *
 * Lane: Shared
 * Type: Error handler
 * LLM: No
 *
 * Handles degraded execution paths:
 * - partial_data with on_demand: Degraded answer with disclaimer
 * - partial_data with proactive: Suppress all delivery, log failure
 * - Auth errors (401/403): Mark workspace integration as unhealthy
 * - Rate limited (429): Back off, reduce concurrency
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type { ResponsePayload, TraceMetadata } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Handles fallback/error cases.
 *
 * @param state - Current graph state with error information
 * @returns State update with degraded response
 */
export function fallback(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  let responsePayload: ResponsePayload

  // Check for specific error types
  const authError = state.fetchErrors.find(
    (e) => e.statusCode === 401 || e.statusCode === 403
  )
  const rateLimitError = state.fetchErrors.find(
    (e) => e.statusCode === 429
  )

  if (state.mode === 'on_demand') {
    // On-demand: provide degraded answer with disclaimer
    let disclaimer: string

    if (authError) {
      disclaimer = 'Unable to access Ship data. Please check your authentication.'
    } else if (rateLimitError) {
      disclaimer = 'Ship API is temporarily rate limited. Please try again in a moment.'
    } else if (state.fallbackReason) {
      disclaimer = state.fallbackReason
    } else {
      disclaimer = 'Some Ship data was unavailable, so this answer may be incomplete.'
    }

    responsePayload = {
      type: 'degraded',
      disclaimer,
      partialAnswer: state.userQuestion ? {
        text: `I wasn't able to fully analyze this ${state.documentType ?? 'document'} due to data access issues.`,
        entityLinks: [],
        suggestedNextSteps: ['Try refreshing the page', 'Check your connection'],
      } : undefined,
    }
  } else {
    // Proactive: suppress all delivery
    responsePayload = { type: 'empty' }

    // Log the failure for observability
    console.warn('[FleetGraph] Proactive sweep failed:', {
      workspaceId: state.workspaceId,
      runId: state.runId,
      fallbackReason: state.fallbackReason,
      fetchErrors: state.fetchErrors.map((e) => ({
        endpoint: e.endpoint,
        statusCode: e.statusCode,
        message: e.message,
      })),
      authError: authError ? true : false,
      rateLimitError: rateLimitError ? true : false,
    })
  }

  // Update trace metadata
  const traceMetadata: TraceMetadata = {
    ...state.traceMetadata,
    branch: 'fallback',
    completedAt: new Date().toISOString(),
  }

  return {
    responsePayload,
    traceMetadata,
    path: ['fallback'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FallbackRoute = 'persist_run_state'

/**
 * Always routes to persist_run_state after fallback.
 */
export function routeFromFallback(
  _state: FleetGraphStateV2
): FallbackRoute {
  return 'persist_run_state'
}
