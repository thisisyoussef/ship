import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api';
import type {
  FleetGraphFindingLifecycleResponse,
  FleetGraphFindingListResponse,
} from '@/lib/fleetgraph-findings';

function buildQueryString(documentIds: string[]) {
  const params = new URLSearchParams();
  if (documentIds.length > 0) {
    params.set('documentIds', documentIds.join(','));
  }
  return params.toString();
}

async function fetchFleetGraphFindings(documentIds: string[]) {
  const query = buildQueryString(documentIds);
  const response = await apiGet(`/api/fleetgraph/findings${query ? `?${query}` : ''}`);

  if (!response.ok) {
    const error = new Error('Failed to load FleetGraph proactive findings.') as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<FleetGraphFindingListResponse>;
}

async function dismissFleetGraphFinding(id: string) {
  const response = await apiPost(`/api/fleetgraph/findings/${id}/dismiss`);
  if (!response.ok) {
    const error = new Error('Failed to dismiss FleetGraph finding.') as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<FleetGraphFindingLifecycleResponse>;
}

async function snoozeFleetGraphFinding(id: string, minutes: number) {
  const response = await apiPost(`/api/fleetgraph/findings/${id}/snooze`, { minutes });
  if (!response.ok) {
    const error = new Error('Failed to snooze FleetGraph finding.') as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<FleetGraphFindingLifecycleResponse>;
}

export function useFleetGraphFindings(documentIds: string[]) {
  const queryClient = useQueryClient();
  const queryKey = ['fleetgraphFindings', ...documentIds].sort();

  const query = useQuery({
    queryKey,
    queryFn: () => fetchFleetGraphFindings(documentIds),
    enabled: documentIds.length > 0,
    staleTime: 1000 * 30,
  });

  const dismissMutation = useMutation({
    mutationFn: dismissFleetGraphFinding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      snoozeFleetGraphFinding(id, minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    dismissFinding(id: string) {
      dismissMutation.mutate(id);
    },
    errorMessage:
      (query.error instanceof Error && query.error.message)
      || (dismissMutation.error instanceof Error && dismissMutation.error.message)
      || (snoozeMutation.error instanceof Error && snoozeMutation.error.message)
      || null,
    findings: query.data?.findings ?? [],
    isLoading: query.isLoading,
    isMutating: dismissMutation.isPending || snoozeMutation.isPending,
    snoozeFinding(id: string, minutes = 240) {
      snoozeMutation.mutate({ id, minutes });
    },
  };
}
