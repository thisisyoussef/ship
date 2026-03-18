/**
 * Action Execution Service
 *
 * Handles the review -> dialog -> apply flow using the shared action registry.
 * This service is used by both proactive and on-demand flows.
 */

import {
  getActionDefinition,
  parseActionId,
  type FleetGraphActionDraft,
  type FleetGraphDialogSpec,
  type FleetGraphDialogSubmission,
  type FleetGraphExecutionPlan,
  type FleetGraphSelectOption,
} from './registry.js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ActionReviewRequest {
  actionId: string
  draft: FleetGraphActionDraft
  workspaceId: string
}

export interface ActionReviewResponse {
  actionId: string
  dialogSpec: FleetGraphDialogSpec
  draft: FleetGraphActionDraft
}

export interface ActionApplyRequest {
  actionId: string
  draft: FleetGraphActionDraft
  submission: FleetGraphDialogSubmission
  workspaceId: string
}

export interface ActionApplyResponse {
  actionId: string
  executionPlan: FleetGraphExecutionPlan
  results: ActionExecutionResult[]
  status: 'applied' | 'partially_applied' | 'failed'
}

export interface ActionExecutionResult {
  endpoint: string
  method: string
  status: 'success' | 'failed'
  statusCode?: number
  error?: string
  body?: unknown
}

export interface ActionExecutionContext {
  // Function to make Ship REST calls
  shipRequest: (method: string, path: string, body?: unknown) => Promise<{
    ok: boolean
    status: number
    json: () => Promise<unknown>
  }>
  // Function to hydrate options from Ship data
  hydrateOptions?: (
    actionType: string,
    targetId: string,
    workspaceId: string
  ) => Promise<Record<string, FleetGraphSelectOption[]>>
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

export class ActionExecutionService {
  constructor(private context: ActionExecutionContext) {}

  /**
   * Review an action - hydrates dialog options and returns dialog spec
   */
  async review(request: ActionReviewRequest): Promise<ActionReviewResponse> {
    const parsed = parseActionId(request.actionId)
    if (!parsed) {
      throw new ActionExecutionError(
        'Invalid action ID format',
        'INVALID_ACTION_ID'
      )
    }

    const definition = getActionDefinition(parsed.actionType)
    if (!definition) {
      throw new ActionExecutionError(
        `Unknown action type: ${parsed.actionType}`,
        'UNKNOWN_ACTION_TYPE'
      )
    }

    // Hydrate options if the definition supports it
    let options: Record<string, FleetGraphSelectOption[]> = {}
    if (definition.hydrateOptions) {
      options = await definition.hydrateOptions({
        targetId: request.draft.targetId,
        workspaceId: request.workspaceId,
      })
    } else if (this.context.hydrateOptions) {
      options = await this.context.hydrateOptions(
        parsed.actionType,
        request.draft.targetId,
        request.workspaceId
      )
    }

    // Build dialog spec
    const dialogSpec = definition.buildDialogSpec(request.draft, options)

    return {
      actionId: request.actionId,
      dialogSpec,
      draft: request.draft,
    }
  }

  /**
   * Apply an action - validates submission and executes
   */
  async apply(request: ActionApplyRequest): Promise<ActionApplyResponse> {
    const parsed = parseActionId(request.actionId)
    if (!parsed) {
      throw new ActionExecutionError(
        'Invalid action ID format',
        'INVALID_ACTION_ID'
      )
    }

    const definition = getActionDefinition(parsed.actionType)
    if (!definition) {
      throw new ActionExecutionError(
        `Unknown action type: ${parsed.actionType}`,
        'UNKNOWN_ACTION_TYPE'
      )
    }

    // Re-hydrate options for validation
    let options: Record<string, FleetGraphSelectOption[]> = {}
    if (definition.hydrateOptions) {
      options = await definition.hydrateOptions({
        targetId: request.draft.targetId,
        workspaceId: request.workspaceId,
      })
    } else if (this.context.hydrateOptions) {
      options = await this.context.hydrateOptions(
        parsed.actionType,
        request.draft.targetId,
        request.workspaceId
      )
    }

    const dialogSpec = definition.buildDialogSpec(request.draft, options)

    // Validate submission
    const validation = definition.validateSubmission(request.submission, dialogSpec)
    if (!validation.valid) {
      throw new ActionExecutionError(
        validation.error,
        'VALIDATION_ERROR'
      )
    }

    // Build execution plan
    const executionPlan = definition.buildExecutionPlan(
      request.draft,
      request.submission
    )

    // Execute the plan
    const results = await this.executeplan(executionPlan)

    // Determine overall status
    const allSuccess = results.every(r => r.status === 'success')
    const allFailed = results.every(r => r.status === 'failed')
    const status = allSuccess
      ? 'applied'
      : allFailed
        ? 'failed'
        : 'partially_applied'

    return {
      actionId: request.actionId,
      executionPlan,
      results,
      status,
    }
  }

  /**
   * Execute an execution plan
   */
  private async executeplan(
    plan: FleetGraphExecutionPlan
  ): Promise<ActionExecutionResult[]> {
    if (plan.sequential) {
      // Execute endpoints one at a time
      const results: ActionExecutionResult[] = []
      for (const endpoint of plan.endpoints) {
        const result = await this.executeEndpoint(endpoint)
        results.push(result)
        // Stop on first failure for sequential plans
        if (result.status === 'failed') {
          break
        }
      }
      return results
    } else {
      // Execute all endpoints in parallel
      return Promise.all(
        plan.endpoints.map(endpoint => this.executeEndpoint(endpoint))
      )
    }
  }

  /**
   * Execute a single endpoint
   */
  private async executeEndpoint(endpoint: {
    method: string
    path: string
    body?: unknown
  }): Promise<ActionExecutionResult> {
    try {
      const response = await this.context.shipRequest(
        endpoint.method,
        endpoint.path,
        endpoint.body
      )

      if (response.ok) {
        const body = await response.json().catch(() => undefined)
        return {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'success',
          statusCode: response.status,
          body,
        }
      } else {
        const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'failed',
          statusCode: response.status,
          error: (errorBody as { error?: string })?.error ?? `HTTP ${response.status}`,
        }
      }
    } catch (error) {
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Error Class                                                        */
/* ------------------------------------------------------------------ */

export class ActionExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'ActionExecutionError'
  }
}
