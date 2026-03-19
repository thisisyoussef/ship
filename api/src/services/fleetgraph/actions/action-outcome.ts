import type { FleetGraphActionType } from './registry.js'
import { isJsonObject, readShipActionMessage } from './executor.js'

interface ActionResultLike {
  errorMessage?: string
  responseBody?: unknown
  statusCode: number
  success: boolean
}

interface ExecutionResultLike {
  body?: unknown
  error?: string
  status: 'failed' | 'success'
  statusCode?: number
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function readStartWeekStatus(responseBody: unknown) {
  if (!isJsonObject(responseBody)) {
    return null
  }

  return typeof responseBody.status === 'string'
    ? responseBody.status.toLowerCase()
    : null
}

export function buildFleetGraphActionFailureMessage(
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

export function buildFleetGraphActionSuccessMessage(
  actionType: FleetGraphActionType,
  params: {
    responseBody?: unknown
    targetName?: string | null
  } = {}
) {
  switch (actionType) {
    case 'start_week': {
      const body = isJsonObject(params.responseBody) ? params.responseBody : undefined
      const count = Number(body?.snapshot_issue_count ?? 0)
      const scopedIssueText = Number.isFinite(count) && count > 0
        ? ` with ${pluralize(count, 'scoped issue')} ready to track`
        : ''
      const targetName = typeof params.targetName === 'string' && params.targetName.trim().length > 0
        ? params.targetName.trim()
        : null

      return targetName
        ? `Week "${targetName}" is now active in Ship${scopedIssueText}.`
        : `The week is now active in Ship${scopedIssueText}.`
    }
    default:
      return 'FleetGraph applied the requested action in Ship.'
  }
}

export function normalizeFleetGraphActionResult<T extends ActionResultLike>(
  actionType: FleetGraphActionType,
  result: T
): T {
  if (!result.success) {
    return {
      ...result,
      errorMessage: buildFleetGraphActionFailureMessage(
        actionType,
        result.responseBody,
        result.statusCode
      ),
    }
  }

  if (actionType === 'start_week') {
    const status = readStartWeekStatus(result.responseBody)
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

export function normalizeFleetGraphExecutionResult<T extends ExecutionResultLike>(
  actionType: FleetGraphActionType,
  result: T
): T {
  if (result.status !== 'success') {
    return {
      ...result,
      error: buildFleetGraphActionFailureMessage(
        actionType,
        result.body,
        result.statusCode ?? 0
      ),
    }
  }

  if (actionType === 'start_week') {
    const status = readStartWeekStatus(result.body)
    if (status && status !== 'active') {
      return {
        ...result,
        error: 'Ship responded, but this week is still marked Planning. Nothing changed in Ship.',
        status: 'failed',
      }
    }
  }

  return result
}
