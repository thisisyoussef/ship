import { task } from '@langchain/langgraph'

import { buildEmptyDialogSubmission } from '../../actions/drafts.js'
import {
  isJsonObject,
} from '../../actions/executor.js'
import { normalizeFleetGraphActionResult } from '../../actions/action-outcome.js'
import {
  getActionDefinition,
  type FleetGraphActionDraft,
  type FleetGraphDialogSubmission,
} from '../../actions/registry.js'
import type { ParallelFetchConfig } from '../../proactive/parallel-fetch.js'
import type {
  ActionResult,
  FleetGraphActionType,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

export interface ExecuteConfirmedActionDeps {
  config: ParallelFetchConfig
  findingStore?: {
    beginActionExecution(params: {
      actionType: FleetGraphActionType
      endpoint: { method: string; path: string }
      findingKey?: string
      workspaceId: string
    }): Promise<{
      execution?: {
        endpoint: { method: string; path: string }
        message: string
        resultStatusCode?: number
        status: 'already_applied' | 'applied' | 'failed' | 'pending'
      }
      shouldExecute: boolean
    }>
  }
}

export function normalizeActionResult(
  actionType: FleetGraphActionType,
  result: ActionResult
): ActionResult {
  return normalizeFleetGraphActionResult(actionType, result)
}

// ──────────────────────────────────────────────────────────────────────────────
// Pre-execution validation - guards against stale findings
// ──────────────────────────────────────────────────────────────────────────────

interface PreValidationResult {
  valid: boolean
  reason?: string
}

async function fetchDocumentState(
  path: string,
  config: ParallelFetchConfig
): Promise<Record<string, unknown> | null> {
  const fetchFn = config.fetchFn ?? fetch
  const baseUrl = config.requestContext?.baseUrl ?? config.baseUrl
  const headers: Record<string, string> = {
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
    const response = await fetchFn(`${baseUrl}${path}`, { headers, method: 'GET' })
    if (!response.ok) return null
    const body = await response.json().catch(() => null)
    return isJsonObject(body) ? body : null
  } catch {
    return null
  }
}

async function preValidateAction(
  actionDraft: FleetGraphActionDraft,
  submission: FleetGraphDialogSubmission | null,
  config: ParallelFetchConfig
): Promise<PreValidationResult> {
  const { actionType, targetId } = actionDraft

  switch (actionType) {
    case 'assign_owner': {
      const doc = await fetchDocumentState(`/api/documents/${targetId}`, config)
      if (!doc) return { valid: true } // Can't pre-validate, let execution handle it
      const props = isJsonObject(doc.properties) ? doc.properties : {}
      const currentOwnerId = typeof props.owner_id === 'string' ? props.owner_id : null
      const assigneeIds = Array.isArray(props.assignee_ids) ? props.assignee_ids : []
      const effectiveOwner = currentOwnerId || (typeof assigneeIds[0] === 'string' ? assigneeIds[0] : null)
      const submittedOwnerId = submission?.values?.person_id

      if (effectiveOwner && submittedOwnerId === effectiveOwner) {
        return { valid: false, reason: 'This week already has the selected person as owner.' }
      }
      if (!submittedOwnerId) {
        return { valid: false, reason: 'No owner was selected. Please select a team member.' }
      }
      return { valid: true }
    }

    case 'start_week': {
      const week = await fetchDocumentState(`/api/weeks/${targetId}`, config)
      if (!week) return { valid: true }
      const status = typeof week.status === 'string' ? week.status : null
      if (status === 'active') {
        return { valid: false, reason: 'This week is already active.' }
      }
      if (status === 'completed') {
        return { valid: false, reason: 'This week is already completed.' }
      }
      return { valid: true }
    }

    case 'assign_issues': {
      // Validate that at least one issue ID and an assignee were provided
      const issueIds = submission?.values?.issue_ids
      const personId = submission?.values?.person_id
      if (!Array.isArray(issueIds) || issueIds.length === 0) {
        return { valid: false, reason: 'No issues were selected for assignment.' }
      }
      if (!personId) {
        return { valid: false, reason: 'No assignee was selected.' }
      }
      return { valid: true }
    }

    default:
      return { valid: true }
  }
}

async function executeEndpoint(
  endpoint: { method: string; path: string; body?: unknown },
  config: ParallelFetchConfig
): Promise<ActionResult> {
  const fetchFn = config.fetchFn ?? fetch
  const baseUrl = config.requestContext?.baseUrl ?? config.baseUrl
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
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
    const response = await fetchFn(`${baseUrl}${endpoint.path}`, {
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      headers,
      method: endpoint.method,
    })
    const responseBody = await response.json().catch(() => null)

    return {
      endpoint: `${endpoint.method} ${endpoint.path}`,
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      executedAt: new Date().toISOString(),
      method: endpoint.method,
      path: endpoint.path,
      responseBody,
      statusCode: response.status,
      success: response.ok,
    }
  } catch (error) {
    return {
      endpoint: `${endpoint.method} ${endpoint.path}`,
      errorMessage: error instanceof Error ? error.message : 'Unknown FleetGraph action error',
      executedAt: new Date().toISOString(),
      method: endpoint.method,
      path: endpoint.path,
      statusCode: 0,
      success: false,
    }
  }
}

async function executePlan(
  endpoints: Array<{ method: string; path: string; body?: unknown }>,
  sequential: boolean,
  config: ParallelFetchConfig
) {
  if (sequential) {
    let lastResult: ActionResult | null = null
    for (const endpoint of endpoints) {
      lastResult = await executeEndpoint(endpoint, config)
      if (!lastResult.success) {
        return lastResult
      }
    }
    return lastResult
  }

  const results = await Promise.all(endpoints.map((endpoint) => executeEndpoint(endpoint, config)))
  return results.find((result) => !result.success) ?? results[results.length - 1] ?? null
}

export async function executeConfirmedAction(
  state: FleetGraphStateV2,
  deps: ExecuteConfirmedActionDeps
): Promise<FleetGraphStateV2Update> {
  const pendingApproval = state.pendingApproval
  if (!pendingApproval) {
    return {
      actionResult: {
        endpoint: 'unknown',
        errorMessage: 'No pending FleetGraph approval was available to execute.',
        executedAt: new Date().toISOString(),
        statusCode: 0,
        success: false,
      },
      path: ['execute_confirmed_action'],
    }
  }

  const definition = getActionDefinition(pendingApproval.actionDraft.actionType)
  if (!definition) {
    return {
      actionResult: {
        endpoint: 'unknown',
        errorMessage: `Unknown action type ${pendingApproval.actionDraft.actionType}`,
        executedAt: new Date().toISOString(),
        statusCode: 0,
        success: false,
      },
      path: ['execute_confirmed_action'],
    }
  }

  const submission = state.dialogSubmission
    ?? buildEmptyDialogSubmission(pendingApproval.actionDraft.actionId)
  const executionPlan = definition.buildExecutionPlan(
    pendingApproval.actionDraft,
    submission
  )
  const firstEndpoint = executionPlan.endpoints[0]

  if (!firstEndpoint) {
    return {
      actionResult: {
        endpoint: 'unknown',
        errorMessage: 'No execution endpoint was generated for this FleetGraph action.',
        executedAt: new Date().toISOString(),
        statusCode: 0,
        success: false,
      },
      path: ['execute_confirmed_action'],
    }
  }

  // Pre-execution validation: verify the action is still applicable
  const preCheck = await preValidateAction(
    pendingApproval.actionDraft,
    submission,
    deps.config
  )
  if (!preCheck.valid) {
    return {
      actionResult: {
        endpoint: `${firstEndpoint.method} ${firstEndpoint.path}`,
        errorMessage: preCheck.reason ?? 'This action is no longer applicable.',
        executedAt: new Date().toISOString(),
        method: firstEndpoint.method,
        path: firstEndpoint.path,
        statusCode: 0,
        success: false,
      },
      path: ['execute_confirmed_action'],
    }
  }

  if (deps.findingStore) {
    const begin = await deps.findingStore.beginActionExecution({
      actionType: pendingApproval.actionDraft.actionType,
      endpoint: {
        method: firstEndpoint.method,
        path: firstEndpoint.path,
      },
      findingKey: pendingApproval.reasonedFinding.fingerprint,
      workspaceId: state.workspaceId,
    })
    if (!begin.shouldExecute) {
      return {
        actionResult: {
          endpoint: `${begin.execution?.endpoint.method ?? firstEndpoint.method} ${begin.execution?.endpoint.path ?? firstEndpoint.path}`,
          errorMessage: begin.execution?.status === 'failed' ? begin.execution.message : undefined,
          executedAt: new Date().toISOString(),
          method: begin.execution?.endpoint.method ?? firstEndpoint.method,
          path: begin.execution?.endpoint.path ?? firstEndpoint.path,
          statusCode: begin.execution?.resultStatusCode ?? 200,
          success: begin.execution?.status !== 'failed',
        },
        path: ['execute_confirmed_action'],
      }
    }
  }

  const executeTask = task(
    `fleetgraph_v2_execute_${pendingApproval.id}`,
    async () => executePlan(
      executionPlan.endpoints,
      executionPlan.sequential,
      deps.config,
    )
  )

  const actionResult = await executeTask()
  const normalizedActionResult = actionResult
    ? normalizeActionResult(
      pendingApproval.actionDraft.actionType,
      actionResult,
    )
    : null

  return {
    actionResult: normalizedActionResult ?? {
      endpoint: `${firstEndpoint.method} ${firstEndpoint.path}`,
      errorMessage: 'FleetGraph did not produce an execution result.',
      executedAt: new Date().toISOString(),
      method: firstEndpoint.method,
      path: firstEndpoint.path,
      statusCode: 0,
      success: false,
    },
    path: ['execute_confirmed_action'],
  }
}

export type ExecuteConfirmedActionRoute = 'persist_action_outcome'

export function routeFromExecuteConfirmedAction(
  _state: FleetGraphStateV2
): ExecuteConfirmedActionRoute {
  return 'persist_action_outcome'
}
