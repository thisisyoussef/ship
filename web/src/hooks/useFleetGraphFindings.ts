import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api';
import type {
  FleetGraphFindingLifecycleResponse,
  FleetGraphFindingListResponse,
  FleetGraphFindingReviewResponse,
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
    const error = new Error(
      'FleetGraph could not load this week’s proactive findings. Try refreshing the page.'
    ) as Error & {
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
    const error = new Error(
      'FleetGraph could not hide this finding right now. Nothing changed.'
    ) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<FleetGraphFindingLifecycleResponse>;
}

async function applyFleetGraphFinding(id: string) {
  const response = await apiPost(`/api/fleetgraph/findings/${id}/apply`);
  if (!response.ok) {
    const error = new Error(
      'FleetGraph could not complete that Ship action right now. Nothing changed in Ship.'
    ) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<FleetGraphFindingLifecycleResponse>;
}

async function reviewFleetGraphFinding(id: string) {
  const response = await apiPost(`/api/fleetgraph/findings/${id}/review`);
  if (!response.ok) {
    const error = new Error(
      'FleetGraph could not prepare that review right now. Nothing changed in Ship.'
    ) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<FleetGraphFindingReviewResponse>;
}

async function snoozeFleetGraphFinding(id: string, minutes: number) {
  const response = await apiPost(`/api/fleetgraph/findings/${id}/snooze`, { minutes });
  if (!response.ok) {
    const error = new Error(
      'FleetGraph could not snooze this finding right now. Nothing changed.'
    ) as Error & {
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

  const applyMutation = useMutation({
    mutationFn: applyFleetGraphFinding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['document'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: reviewFleetGraphFinding,
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      snoozeFleetGraphFinding(id, minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    async applyFinding(id: string) {
      return applyMutation.mutateAsync(id);
    },
    actionErrorMessage:
      (reviewMutation.error instanceof Error && reviewMutation.error.message)
      || (applyMutation.error instanceof Error && applyMutation.error.message)
      || (dismissMutation.error instanceof Error && dismissMutation.error.message)
      || (snoozeMutation.error instanceof Error && snoozeMutation.error.message)
      || null,
    async dismissFinding(id: string) {
      return dismissMutation.mutateAsync(id);
    },
    findings: query.data?.findings ?? [],
    isLoading: query.isLoading,
    isMutating:
      reviewMutation.isPending
      || applyMutation.isPending
      || dismissMutation.isPending
      || snoozeMutation.isPending,
    loadErrorMessage: query.error instanceof Error ? query.error.message : null,
    resetActionState() {
      reviewMutation.reset();
      applyMutation.reset();
      dismissMutation.reset();
      snoozeMutation.reset();
    },
    async reviewFinding(id: string) {
      return reviewMutation.mutateAsync(id);
    },
    async snoozeFinding(id: string, minutes = 240) {
      return snoozeMutation.mutateAsync({ id, minutes });
    },
  };
}
