/**
 * fetch_primary_document - On-Demand Lane
 *
 * Lane: On-Demand
 * Type: REST fetch
 * LLM: No
 *
 * Fetches the primary document that the user is currently viewing.
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type { ParallelFetchConfig } from '../../proactive/parallel-fetch.js'
import { logFleetGraph } from '../../logging.js'
import type { ShipDocument, FetchError } from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchPrimaryDocumentDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Fetch Helper
// ──────────────────────────────────────────────────────────────────────────────

async function fetchDocument(
  documentId: string,
  config: ParallelFetchConfig
): Promise<{ document: ShipDocument | null; error: FetchError | null }> {
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
    const response = await fetchFn(
      `${baseUrl}/api/documents/${encodeURIComponent(documentId)}`,
      { headers, method: 'GET' }
    )

    if (!response.ok) {
      return {
        document: null,
        error: {
          endpoint: `GET /api/documents/${documentId}`,
          statusCode: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
          retryCount: 0,
          timestamp: new Date().toISOString(),
        },
      }
    }

    const data = await response.json() as ShipDocument
    return { document: data, error: null }
  } catch (err) {
    return {
      document: null,
      error: {
        endpoint: `GET /api/documents/${documentId}`,
        message: err instanceof Error ? err.message : 'Unknown fetch error',
        retryCount: 0,
        timestamp: new Date().toISOString(),
      },
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the primary document the user is viewing.
 *
 * @param state - Current graph state with document ID
 * @param deps - Dependencies including fetch config
 * @returns State update with raw primary document
 */
export async function fetchPrimaryDocumentNode(
  state: FleetGraphStateV2,
  deps: FetchPrimaryDocumentDeps
): Promise<FleetGraphStateV2Update> {
  if (!state.documentId) {
    return {
      rawPrimaryDocument: null,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'No document ID provided for on-demand analysis',
      path: ['fetch_primary_document'],
    }
  }

  const { document, error } = await fetchDocument(state.documentId, deps.config)

  if (error) {
    const baseUrl = deps.config.requestContext?.baseUrl ?? deps.config.baseUrl
    logFleetGraph('error', 'fetch_primary_document:error', {
      baseUrl,
      documentId: state.documentId,
      documentType: state.documentType,
      endpoint: error.endpoint,
      hasCookieHeader: Boolean(deps.config.requestContext?.cookieHeader),
      hasCsrfToken: Boolean(deps.config.requestContext?.csrfToken),
      message: error.message,
      retryCount: error.retryCount,
      statusCode: error.statusCode,
      threadId: state.threadId,
      workspaceId: state.workspaceId,
    })

    return {
      rawPrimaryDocument: null,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'FleetGraph could not load the current Ship document.',
      fetchErrors: [error],
      partialData: true,
      path: ['fetch_primary_document'],
    }
  }

  // Verify document type matches frontend injection
  const serverDocType = document?.documentType?.toLowerCase()
  const expectedDocType = state.documentType?.toLowerCase()

  if (serverDocType && expectedDocType && serverDocType !== expectedDocType) {
    logFleetGraph('warn', 'fetch_primary_document:type_mismatch', {
      documentId: state.documentId,
      expectedDocType,
      serverDocType,
      threadId: state.threadId,
      workspaceId: state.workspaceId,
    })
  }

  return {
    rawPrimaryDocument: document,
    path: ['fetch_primary_document'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchPrimaryDocumentRoute = 'route_by_surface' | 'fallback_fetch'

/**
 * Routes to route_by_surface if document was fetched, otherwise fallback.
 */
export function routeFromPrimaryDocument(
  state: FleetGraphStateV2
): FetchPrimaryDocumentRoute {
  if (state.branch === 'fallback' || !state.rawPrimaryDocument) {
    return 'fallback_fetch'
  }
  return 'route_by_surface'
}
