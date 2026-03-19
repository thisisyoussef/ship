import { task } from '@langchain/langgraph'

import { buildEmptyDialogSubmission } from '../../actions/drafts.js'
import {
  isJsonObject,
  readShipActionMessage,
} from '../../actions/executor.js'
import { getActionDefinition } from '../../actions/registry.js'
import type { ParallelFetchConfig } from '../../proactive/parallel-fetch.js'
import type { ActionResult, FleetGraphActionType } from '../types-v2.js'
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

function buildActionFailureMessage(
  actionType: FleetGraphActionType,
  responseBody: unknown,
  statusCode: number
) {
  const body = isJsonObject(responseBody) ? responseBody : undefined

  switch (actionType) {
    case 'start_week':
      return readShipActionMessage(
        body,
        statusCode > 0
          ? `Ship could not start this week (HTTP ${statusCode}).`
          : 'Ship could not start this week.'
      )
    default:
      return readShipActionMessage(
        body,
        statusCode > 0
          ? `Ship could not apply this FleetGraph action (HTTP ${statusCode}).`
          : 'Ship could not apply this FleetGraph action.'
      )
  }
}

export function normalizeActionResult(
  actionType: FleetGraphActionType,
  result: ActionResult
): ActionResult {
  if (!result.success) {
    return {
      ...result,
      errorMessage: buildActionFailureMessage(
        actionType,
        result.responseBody,
        result.statusCode
      ),
    }
  }

  if (actionType === 'start_week' && isJsonObject(result.responseBody)) {
    const status = typeof result.responseBody.status === 'string'
      ? result.responseBody.status.toLowerCase()
      : undefined
    if (status && status !== 'active') {
      return {
        ...result,
        errorMessage: 'Ship responded, but this week is still marked Planning. Nothing changed in Ship.',
        success: false,
      }
    }
  }

  return result
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
