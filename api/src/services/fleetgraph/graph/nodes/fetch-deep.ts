import type { FleetGraphShipApiClient } from '../../proactive/types.js';
import type { FleetGraphContextEnvelope, FleetGraphDepthHint } from '../types.js';

interface FetchDeepState {
  context?: FleetGraphContextEnvelope;
  deeperContextHint?: FleetGraphDepthHint;
  fetchedData: Record<string, unknown>;
  needsDeeperContext: boolean;
}

interface FetchDeepDeps {
  shipClient: FleetGraphShipApiClient;
}

/**
 * Fetch deep node — performs targeted additional fetches based on the
 * reasoning node's structured hint. Only runs when needsDeeperContext is true.
 * Each hint type maps to a specific fetch strategy.
 */
export function createFetchDeepNode(deps: FetchDeepDeps) {
  return async (state: FetchDeepState) => {
    if (!state.needsDeeperContext || !state.deeperContextHint) {
      return { fetchedData: state.fetchedData };
    }

    const hint = state.deeperContextHint;
    const ctx = state.context;
    let deepData: unknown;

    switch (hint.type) {
      case 'assignee_workload': {
        deepData = await deps.shipClient.fetchMembers(
          hint.ids,
          ctx?.workspaceId ?? ''
        );
        break;
      }

      case 'linked_documents':
      case 'sprint_issues': {
        // Fetch each linked document in parallel
        deepData = await Promise.all(
          hint.ids.map((id) =>
            deps.shipClient.fetchDocument(id, hint.type === 'sprint_issues' ? 'sprint' : 'project')
          )
        );
        break;
      }

      case 'project_members': {
        deepData = await deps.shipClient.fetchMembers(
          hint.ids,
          ctx?.workspaceId ?? ''
        );
        break;
      }

      default:
        deepData = [];
    }

    return {
      fetchedData: {
        ...state.fetchedData,
        [`deep:${hint.type}`]: deepData,
      },
      // Reset depth signals after fulfilling the request
      fetchDepth: 'deep' as const,
      needsDeeperContext: false,
    };
  };
}
