import { getConfig } from '@langchain/langgraph'

import type { ShipRestRequestContext } from '../../actions/executor.js'
import type { FleetGraphShipApiClient } from '../../proactive/types.js';
import type { FleetGraphContextEnvelope } from '../types.js';

interface FetchMediumState {
  context?: FleetGraphContextEnvelope;
  fetchedData: Record<string, unknown>;
  mode: 'proactive' | 'on_demand';
}

interface FetchMediumDeps {
  shipClient: FleetGraphShipApiClient;
}

/**
 * Fetch medium node — retrieves the target document and its one-hop children
 * in parallel. Skips fetch if the document is already cached in fetchedData.
 * No-ops for proactive mode (proactive uses its own data pipeline).
 */
export function createFetchMediumNode(deps: FetchMediumDeps) {
  return async (state: FetchMediumState) => {
    // Proactive mode uses its own fetch pipeline — skip
    if (state.mode === 'proactive') {
      return { fetchedData: state.fetchedData };
    }

    const ctx = state.context;
    if (!ctx) {
      return { fetchedData: state.fetchedData };
    }

    // Cache hit — don't re-fetch
    if (state.fetchedData[ctx.documentId]) {
      return { fetchedData: state.fetchedData };
    }

    const requestContext = getConfig()?.configurable?.fleetgraphReadRequestContext as
      | ShipRestRequestContext
      | undefined

    // Parallel fetch: document + children
    const [document, children] = await Promise.all([
      deps.shipClient.fetchDocument(ctx.documentId, ctx.documentType, requestContext),
      deps.shipClient.fetchChildren(ctx.documentId, ctx.documentType, requestContext),
    ]);

    return {
      fetchedData: {
        ...state.fetchedData,
        [ctx.documentId]: { document, children },
      },
    };
  };
}
