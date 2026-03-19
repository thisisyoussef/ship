import type { Request } from 'express'

export interface ShipRestActionResult {
  body?: Record<string, unknown>
  ok: boolean
  status: number
}

export interface ShipRestRequestContext {
  baseUrl: string
  cookieHeader?: string
  csrfToken?: string
}

export function buildShipRestRequestContext(
  request: Pick<Request, 'get' | 'header' | 'protocol'>
): ShipRestRequestContext {
  return {
    baseUrl: resolveShipRestBaseUrl(request),
    cookieHeader: request.header('cookie') ?? undefined,
    csrfToken: request.header('x-csrf-token') ?? undefined,
  }
}

export type ShipRestExecutor = (
  path: string,
  requestContext: ShipRestRequestContext,
  method?: string
) => Promise<ShipRestActionResult>

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readShipActionMessage(
  body: Record<string, unknown> | undefined,
  fallback: string
) {
  const error = body?.error
  if (typeof error === 'string' && error.trim().length > 0) {
    return error
  }
  return fallback
}

export function isAlreadyActiveResult(result: ShipRestActionResult) {
  return result.status === 400
    && readShipActionMessage(result.body, '').toLowerCase().includes('already active')
}

export function resolveShipRestBaseUrl(
  request: Pick<Request, 'get' | 'protocol'>
) {
  const configuredBaseUrl = process.env.SHIP_API_BASE_URL?.trim()
    || process.env.APP_BASE_URL?.trim()
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '')
  }

  const forwardedProto = request.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const host = request.get('host')?.split(',')[0]?.trim()
    ?? request.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (!host) {
    throw new Error('Unable to resolve the Ship REST base URL for FleetGraph.')
  }

  return `${forwardedProto ?? request.protocol}://${host}`
}

export async function defaultShipRestExecutor(
  path: string,
  requestContext: ShipRestRequestContext,
  method = 'POST'
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
    method,
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

export function buildShipActionSuccessMessage(
  body: Record<string, unknown> | undefined
) {
  if (!isJsonObject(body)) {
    return 'Week started successfully from the FleetGraph apply gate.'
  }

  const count = Number(body.snapshot_issue_count ?? 0)
  if (!Number.isFinite(count) || count < 0) {
    return 'Week started successfully from the FleetGraph apply gate.'
  }

  return `Week started successfully with ${count} scoped issue${count === 1 ? '' : 's'}.`
}
