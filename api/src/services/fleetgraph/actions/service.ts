import type { Request } from 'express'

import {
  createFleetGraphFindingActionStore,
} from './store.js'
import type {
  FleetGraphFindingActionExecutionRecord,
  FleetGraphFindingActionStore,
} from './types.js'
import {
  createFleetGraphFindingStore,
  type FleetGraphFindingRecord,
  type FleetGraphFindingStore,
} from '../findings/index.js'

interface ShipRestActionResult {
  body?: Record<string, unknown>
  ok: boolean
  status: number
}

interface ShipRestRequestContext {
  baseUrl: string
  cookieHeader?: string
  csrfToken?: string
}

type ShipRestExecutor = (
  path: string,
  requestContext: ShipRestRequestContext
) => Promise<ShipRestActionResult>

export class FleetGraphFindingActionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message)
    this.name = 'FleetGraphFindingActionError'
  }
}

interface ApplyFindingActionInput {
  findingId: string
  request: Pick<Request, 'get' | 'header' | 'protocol'>
  workspaceId: string
}

interface FleetGraphFindingWithExecution extends FleetGraphFindingRecord {
  actionExecution?: FleetGraphFindingActionExecutionRecord
}

interface FleetGraphFindingActionServiceDeps {
  executeShipRestAction?: ShipRestExecutor
  findingStore?: FleetGraphFindingStore
  actionStore?: FleetGraphFindingActionStore
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readMessage(
  body: Record<string, unknown> | undefined,
  fallback: string
) {
  const error = body?.error
  if (typeof error === 'string' && error.trim().length > 0) {
    return error
  }
  return fallback
}

function isAlreadyActiveResult(result: ShipRestActionResult) {
  return result.status === 400
    && readMessage(result.body, '').toLowerCase().includes('already active')
}

function resolveBaseUrl(request: Pick<Request, 'get' | 'protocol'>) {
  const forwardedProto = request.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost = request.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost ?? request.get('host')
  if (!host) {
    throw new FleetGraphFindingActionError(
      'Unable to resolve the Ship REST base URL for FleetGraph apply.',
      500
    )
  }

  return `${forwardedProto ?? request.protocol}://${host}`
}

function mapExecutions(
  findings: FleetGraphFindingRecord[],
  executions: FleetGraphFindingActionExecutionRecord[]
) {
  const byFindingId = new Map(
    executions.map((execution) => [execution.findingId, execution])
  )

  return findings.map((finding) => ({
    ...finding,
    actionExecution: byFindingId.get(finding.id),
  }))
}

async function defaultShipRestExecutor(
  path: string,
  requestContext: ShipRestRequestContext
): Promise<ShipRestActionResult> {
  const response = await fetch(`${requestContext.baseUrl}${path}`, {
    headers: {
      ...(requestContext.cookieHeader ? { cookie: requestContext.cookieHeader } : {}),
      ...(requestContext.csrfToken
        ? { 'x-csrf-token': requestContext.csrfToken }
        : {}),
      accept: 'application/json',
      'content-type': 'application/json',
    },
    method: 'POST',
  })

  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? await response.json() as Record<string, unknown>
    : undefined

  return {
    body,
    ok: response.ok,
    status: response.status,
  }
}

export function createFleetGraphFindingActionService(
  deps: FleetGraphFindingActionServiceDeps = {}
) {
  const findingStore = deps.findingStore ?? createFleetGraphFindingStore()
  const actionStore = deps.actionStore ?? createFleetGraphFindingActionStore()
  const executeShipRestAction = deps.executeShipRestAction ?? defaultShipRestExecutor

  return {
    async applyStartWeekFinding(
      input: ApplyFindingActionInput
    ): Promise<FleetGraphFindingWithExecution> {
      const finding = await findingStore.getFindingById(
        input.findingId,
        input.workspaceId
      )

      if (!finding) {
        throw new FleetGraphFindingActionError(
          'FleetGraph finding not found',
          404
        )
      }

      if (finding.status !== 'active') {
        throw new FleetGraphFindingActionError(
          'Only active FleetGraph findings can be applied.',
          409
        )
      }

      const action = finding.recommendedAction
      if (!action || action.type !== 'start_week' || action.endpoint.method !== 'POST') {
        throw new FleetGraphFindingActionError(
          'This FleetGraph finding does not expose a valid start-week action.',
          400
        )
      }

      const executionStart = await actionStore.beginStartWeekExecution({
        endpoint: action.endpoint,
        findingId: finding.id,
        workspaceId: input.workspaceId,
      })

      if (!executionStart.shouldExecute) {
        return {
          ...finding,
          actionExecution: executionStart.execution,
        }
      }

      const requestContext = {
        baseUrl: resolveBaseUrl(input.request),
        cookieHeader: input.request.header('cookie') ?? undefined,
        csrfToken: input.request.header('x-csrf-token') ?? undefined,
      }

      try {
        const result = await executeShipRestAction(
          action.endpoint.path,
          requestContext
        )

        const execution = result.ok
          ? await actionStore.finishStartWeekExecution({
            appliedAt: new Date(),
            endpoint: action.endpoint,
            findingId: finding.id,
            message: buildSuccessMessage(result.body),
            resultStatusCode: result.status,
            status: 'applied',
            workspaceId: input.workspaceId,
          })
          : isAlreadyActiveResult(result)
            ? await actionStore.finishStartWeekExecution({
              appliedAt: new Date(),
              endpoint: action.endpoint,
              findingId: finding.id,
              message: 'Week was already active when this FleetGraph action was applied.',
              resultStatusCode: result.status,
              status: 'already_applied',
              workspaceId: input.workspaceId,
            })
            : await actionStore.finishStartWeekExecution({
              endpoint: action.endpoint,
              findingId: finding.id,
              message: readMessage(
                result.body,
                'Ship could not apply the week-start action.'
              ),
              resultStatusCode: result.status,
              status: 'failed',
              workspaceId: input.workspaceId,
            })

        return {
          ...finding,
          actionExecution: execution,
        }
      } catch (error) {
        const execution = await actionStore.finishStartWeekExecution({
          endpoint: action.endpoint,
          findingId: finding.id,
          message: error instanceof Error
            ? error.message
            : 'Ship could not apply the week-start action.',
          status: 'failed',
          workspaceId: input.workspaceId,
        })

        return {
          ...finding,
          actionExecution: execution,
        }
      }
    },

    async attachExecutions(
      findings: FleetGraphFindingRecord[],
      workspaceId: string
    ): Promise<FleetGraphFindingWithExecution[]> {
      const executions = await actionStore.listExecutionsForFindings(
        workspaceId,
        findings.map((finding) => finding.id)
      )

      return mapExecutions(findings, executions)
    },
  }
}

function buildSuccessMessage(body: Record<string, unknown> | undefined) {
  if (!isJsonObject(body)) {
    return 'Week started successfully from the FleetGraph apply gate.'
  }

  const count = Number(body.snapshot_issue_count ?? 0)
  if (!Number.isFinite(count) || count < 0) {
    return 'Week started successfully from the FleetGraph apply gate.'
  }

  return `Week started successfully with ${count} scoped issue${count === 1 ? '' : 's'}.`
}
