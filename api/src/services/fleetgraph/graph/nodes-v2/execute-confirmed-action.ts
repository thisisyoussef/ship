/**
 * execute_confirmed_action - Shared Pipeline (Post-Approval)
 *
 * Lane: Shared
 * Type: REST mutation (wrapped in task() for idempotent replay)
 * LLM: No
 *
 * Executes the confirmed action against the Ship API.
 *
 * Ship write endpoints used:
 * - POST /api/weeks/:id/start
 * - PATCH /api/issues/:id
 * - POST /api/weeks/:id/approve-plan
 * - POST /api/weeks/:id/request-plan-changes
 * - POST /api/weeks/:id/carryover
 * - POST /api/documents/:id/comments
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import { task } from '@langchain/langgraph'

import type { ParallelFetchConfig } from '../../proactive/parallel-fetch.js'
import type { ActionResult } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface ExecuteConfirmedActionDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Execution Logic
// ──────────────────────────────────────────────────────────────────────────────

async function executeAction(
  endpoint: { method: string; path: string; body?: Record<string, unknown> },
  config: ParallelFetchConfig
): Promise<ActionResult> {
  const fetchFn = config.fetchFn ?? fetch
  const baseUrl = config.requestContext?.baseUrl ?? config.baseUrl
  const url = `${baseUrl}${endpoint.path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    accept: 'application/json',
  }

  if (config.requestContext?.cookieHeader) {
    headers.cookie = config.requestContext.cookieHeader
  }
  if (config.requestContext?.csrfToken) {
    headers['x-csrf-token'] = config.requestContext.csrfToken
  }
  if (!config.requestContext && config.token) {
    headers.Authorization = `Bearer ${config.token}`
  }

  try {
    const response = await fetchFn(url, {
      method: endpoint.method,
      headers,
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    })

    const responseBody = await response.json().catch(() => null)

    return {
      success: response.ok,
      endpoint: `${endpoint.method} ${endpoint.path}`,
      statusCode: response.status,
      responseBody,
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      executedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      success: false,
      endpoint: `${endpoint.method} ${endpoint.path}`,
      statusCode: 0,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      executedAt: new Date().toISOString(),
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Executes the confirmed action against the Ship API.
 *
 * Uses LangGraph's task() wrapper to ensure idempotent replay -
 * if the graph is resumed multiple times, the action is only executed once.
 *
 * @param state - Current graph state with pending approval
 * @param deps - Dependencies including fetch config
 * @returns State update with action result
 */
export async function executeConfirmedAction(
  state: FleetGraphStateV2,
  deps: ExecuteConfirmedActionDeps
): Promise<FleetGraphStateV2Update> {
  if (!state.pendingApproval) {
    return {
      actionResult: {
        success: false,
        endpoint: 'unknown',
        statusCode: 0,
        errorMessage: 'No pending approval to execute',
        executedAt: new Date().toISOString(),
      },
      path: ['execute_confirmed_action'],
    }
  }

  const { proposedAction } = state.pendingApproval

  // Wrap in task() for idempotent replay
  const executeTask = task(
    `execute_action_${state.pendingApproval.id}`,
    async () => {
      return executeAction(proposedAction.endpoint, deps.config)
    }
  )

  const actionResult = await executeTask()

  return {
    actionResult,
    path: ['execute_confirmed_action'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type ExecuteConfirmedActionRoute = 'persist_action_outcome'

/**
 * Always routes to persist_action_outcome after execution.
 */
export function routeFromExecuteConfirmedAction(
  _state: FleetGraphStateV2
): ExecuteConfirmedActionRoute {
  return 'persist_action_outcome'
}
