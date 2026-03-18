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
      fallbackReason: 'No document ID provided for on-demand analysis',
      path: ['fetch_primary_document'],
    }
  }

  const { document, error } = await fetchDocument(state.documentId, deps.config)

  if (error) {
    return {
      rawPrimaryDocument: null,
      fetchErrors: [error],
      partialData: true,
      path: ['fetch_primary_document'],
    }
  }

  // Verify document type matches frontend injection
  const serverDocType = document?.documentType?.toLowerCase()
  const expectedDocType = state.documentType?.toLowerCase()

  if (serverDocType && expectedDocType && serverDocType !== expectedDocType) {
    console.warn(
      `FleetGraph: Document type mismatch. Expected ${expectedDocType}, got ${serverDocType}. Using server-side type.`
    )
  }

  return {
    rawPrimaryDocument: document,
    path: ['fetch_primary_document'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchPrimaryDocumentRoute = 'route_by_surface' | 'fallback'

/**
 * Routes to route_by_surface if document was fetched, otherwise fallback.
 */
export function routeFromPrimaryDocument(
  state: FleetGraphStateV2
): FetchPrimaryDocumentRoute {
  if (state.branch === 'fallback' || !state.rawPrimaryDocument) {
    return 'fallback'
  }
  return 'route_by_surface'
}
