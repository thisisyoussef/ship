import { z } from 'zod'

import type { ShipRestRequestContext } from '../actions/executor.js'
import {
  ShipWeeksResponseSchema,
  type FleetGraphShipApiClient,
  type ShipSprintIssuesResponse,
} from './types.js'

const ShipIssueDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  assignee_id: z.string().nullable().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  properties: z.object({
    assignee_id: z.string().nullable().optional(),
    state: z.string().optional(),
    status: z.string().optional(),
  }).passthrough().optional(),
}).passthrough()

const ShipSprintIssuesRawSchema = z.union([
  z.array(ShipIssueDocumentSchema),
  z.object({
    documents: z.array(ShipIssueDocumentSchema),
  }).passthrough(),
])

function parseSprintIssuesResponse(
  raw: z.infer<typeof ShipSprintIssuesRawSchema>
): ShipSprintIssuesResponse {
  const documents = Array.isArray(raw) ? raw : raw.documents
  return {
    issues: documents.map((doc) => ({
      assignee_id: doc.assignee_id ?? doc.properties?.assignee_id ?? null,
      id: doc.id,
      status: doc.state ?? doc.status ?? doc.properties?.state ?? doc.properties?.status ?? 'open',
      title: doc.title,
    })),
  }
}

export interface FleetGraphShipApiEnv {
  APP_BASE_URL?: string
  FLEETGRAPH_API_TOKEN?: string
}

interface FleetGraphShipApiConfig {
  baseUrl: string
  token: string
}

function buildReadHeaders(
  config: FleetGraphShipApiConfig,
  requestContext?: ShipRestRequestContext
) {
  if (!requestContext) {
    if (!config.token) {
      throw new Error(
        'FleetGraph proactive mode requires FLEETGRAPH_API_TOKEN environment variable.'
      )
    }
    return {
      Authorization: `Bearer ${config.token}`,
    } satisfies Record<string, string>
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
  }

  if (requestContext.cookieHeader) {
    headers.cookie = requestContext.cookieHeader
  }

  if (requestContext.csrfToken) {
    headers['x-csrf-token'] = requestContext.csrfToken
  }

  return headers
}

function buildReadUrl(
  config: FleetGraphShipApiConfig,
  path: string,
  requestContext?: ShipRestRequestContext
) {
  const baseUrl = requestContext?.baseUrl ?? config.baseUrl
  if (!baseUrl) {
    throw new Error(
      'FleetGraph Ship REST requires either a request context or APP_BASE_URL environment variable.'
    )
  }
  return `${baseUrl}${path}`
}

export function resolveFleetGraphShipApiConfig(
  env: FleetGraphShipApiEnv | NodeJS.ProcessEnv = process.env
): FleetGraphShipApiConfig {
  // Don't throw here - on-demand analysis uses requestContext instead of token-based auth.
  // Methods that require proactive/token-based auth will validate at call time.
  return {
    baseUrl: trimUrl(env.APP_BASE_URL) ?? '',
    token: env.FLEETGRAPH_API_TOKEN?.trim() ?? '',
  }
}

export function createFleetGraphShipApiClient(
  config: FleetGraphShipApiConfig,
  deps: { fetchFn?: typeof fetch } = {}
): FleetGraphShipApiClient {
  const fetchFn = deps.fetchFn ?? fetch

  return {
    async fetchChildren(documentId: string, documentType: string, requestContext?: ShipRestRequestContext) {
      const url = buildReadUrl(
        config,
        `/api/documents?parent_id=${encodeURIComponent(documentId)}&document_type=${encodeURIComponent(documentType)}`,
        requestContext
      )
      const response = await fetchFn(url, {
        headers: buildReadHeaders(config, requestContext),
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`FleetGraph Ship fetch children request failed with ${response.status}.`)
      }

      const raw = await response.json() as { documents?: unknown[] } | unknown[]
      if (Array.isArray(raw)) {
        return raw
      }

      return Array.isArray(raw.documents) ? raw.documents : []
    },

    async fetchDocument(documentId: string, _documentType: string, requestContext?: ShipRestRequestContext) {
      const url = buildReadUrl(
        config,
        `/api/documents/${encodeURIComponent(documentId)}`,
        requestContext
      )
      const response = await fetchFn(url, {
        headers: buildReadHeaders(config, requestContext),
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`FleetGraph Ship fetch document request failed with ${response.status}.`)
      }

      return response.json()
    },

    async fetchMembers(
      userIds: string[],
      workspaceId: string,
      requestContext?: ShipRestRequestContext
    ) {
      if (userIds.length === 0) {
        return []
      }

      const ids = userIds.map((id) => encodeURIComponent(id)).join(',')
      const url = buildReadUrl(
        config,
        `/api/people?workspace_id=${encodeURIComponent(workspaceId)}&ids=${ids}`,
        requestContext
      )
      const response = await fetchFn(url, {
        headers: buildReadHeaders(config, requestContext),
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`FleetGraph Ship fetch members request failed with ${response.status}.`)
      }

      const raw = await response.json() as { documents?: unknown[]; people?: unknown[] }
      const list = raw.people ?? raw.documents ?? []
      return Array.isArray(list) ? list : []
    },

    async listSprintIssues(sprintId: string, requestContext?: ShipRestRequestContext) {
      const url = buildReadUrl(
        config,
        `/api/weeks/${encodeURIComponent(sprintId)}/issues`,
        requestContext
      )
      const response = await fetchFn(url, {
        headers: buildReadHeaders(config, requestContext),
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`FleetGraph Ship sprint issues request failed with ${response.status}.`)
      }

      const raw = ShipSprintIssuesRawSchema.parse(await response.json())
      return parseSprintIssuesResponse(raw)
    },

    async listWeeks(requestContext?: ShipRestRequestContext) {
      const response = await fetchFn(buildReadUrl(config, '/api/weeks', requestContext), {
        headers: buildReadHeaders(config, requestContext),
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`FleetGraph Ship weeks request failed with ${response.status}.`)
      }

      return ShipWeeksResponseSchema.parse(await response.json())
    },
  }
}

function trimUrl(value?: string) {
  const normalized = value?.trim()
  if (!normalized) {
    return undefined
  }
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}
