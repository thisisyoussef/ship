import type { ToolContext } from '../types.js'

export async function fetchShipApi(path: string, ctx: ToolContext): Promise<unknown> {
  const baseUrl = ctx.requestContext.baseUrl
  const headers: Record<string, string> = { accept: 'application/json' }
  if (ctx.requestContext.cookieHeader) headers.cookie = ctx.requestContext.cookieHeader
  if (ctx.requestContext.csrfToken) headers['x-csrf-token'] = ctx.requestContext.csrfToken

  const response = await fetch(`${baseUrl}${path}`, { headers, method: 'GET' })
  if (!response.ok) {
    throw new Error(`Ship API ${path} failed: ${response.status}`)
  }
  return response.json()
}
