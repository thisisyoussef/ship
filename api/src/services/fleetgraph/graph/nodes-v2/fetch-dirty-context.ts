/**
 * fetch_dirty_context - Event-Driven Lane
 *
 * Lane: Event-Driven
 * Type: REST fetch
 * LLM: No
 *
 * Fetches the dirty entity and its cluster based on the event payload.
 *
 * Logic:
 * 1. Fetch the dirty entity: GET /api/documents/:dirty_entity_id
 * 2. Determine entity type and fetch its full cluster
 * 3. If dirty_coalesced_ids are present, batch-fetch those too
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchIssueCluster,
  fetchWeekCluster,
  fetchProjectCluster,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type {
  ShipDocument,
  FetchError,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchDirtyContextDeps {
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
 * Fetches the dirty entity and its cluster.
 *
 * @param state - Current graph state with dirty entity info
 * @param deps - Dependencies including fetch config
 * @returns State update with dirty entity and cluster data
 */
export async function fetchDirtyContextNode(
  state: FleetGraphStateV2,
  deps: FetchDirtyContextDeps
): Promise<FleetGraphStateV2Update> {
  if (!state.dirtyEntityId) {
    return {
      rawPrimaryDocument: null,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'No dirty entity ID provided for event-driven analysis',
      path: ['fetch_dirty_context'],
    }
  }

  const allErrors: FetchError[] = []

  // Fetch the dirty entity
  const { document, error } = await fetchDocument(state.dirtyEntityId, deps.config)

  if (error) {
    allErrors.push(error)
    return {
      rawPrimaryDocument: null,
      fetchErrors: allErrors,
      partialData: true,
      branch: 'fallback',
      fallbackStage: 'fetch',
      fallbackReason: 'Failed to fetch dirty entity',
      path: ['fetch_dirty_context'],
    }
  }

  // Determine entity type and fetch its cluster
  const entityType = state.dirtyEntityType ?? document?.documentType?.toLowerCase()

  let result: FleetGraphStateV2Update = {
    rawPrimaryDocument: document,
    fetchErrors: allErrors,
    path: ['fetch_dirty_context'],
  }

  // Fetch the appropriate cluster based on entity type
  switch (entityType) {
    case 'issue': {
      const { cluster, errors } = await fetchIssueCluster(
        state.dirtyEntityId,
        deps.config
      )
      allErrors.push(...errors)
      result = {
        ...result,
        rawIssueCluster: cluster,
        rawPeople: cluster?.relatedPeople ?? [],
        fetchErrors: allErrors,
        partialData: allErrors.length > 0,
      }
      break
    }

    case 'sprint':
    case 'week': {
      const { cluster, errors } = await fetchWeekCluster(
        state.dirtyEntityId,
        deps.config
      )
      allErrors.push(...errors)
      result = {
        ...result,
        rawWeekCluster: cluster,
        rawPeople: cluster?.relatedPeople ?? [],
        fetchErrors: allErrors,
        partialData: allErrors.length > 0,
      }
      break
    }

    case 'project': {
      const { cluster, errors } = await fetchProjectCluster(
        state.dirtyEntityId,
        deps.config
      )
      allErrors.push(...errors)
      result = {
        ...result,
        rawProjectCluster: cluster,
        rawPeople: cluster?.relatedPeople ?? [],
        fetchErrors: allErrors,
        partialData: allErrors.length > 0,
      }
      break
    }

    default:
      // For unknown types, just use the document
      break
  }

  // Fetch coalesced entities if present
  if (state.dirtyCoalescedIds.length > 0) {
    const coalescedPromises = state.dirtyCoalescedIds.map((id) =>
      fetchDocument(id, deps.config)
    )
    const coalescedResults = await Promise.all(coalescedPromises)

    for (const cr of coalescedResults) {
      if (cr.error) {
        allErrors.push(cr.error)
      }
    }
  }

  return {
    ...result,
    fetchErrors: allErrors,
    partialData: allErrors.length > 0,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchDirtyContextRoute = 'expand_affected_cluster' | 'fallback_fetch'

/**
 * Routes to expand_affected_cluster or fallback on error.
 */
export function routeFromDirtyContext(
  state: FleetGraphStateV2
): FetchDirtyContextRoute {
  if (state.branch === 'fallback') {
    return 'fallback_fetch'
  }
  return 'expand_affected_cluster'
}
