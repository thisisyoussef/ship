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
      'FleetGraph could not load proactive findings for this page right now. Try refreshing the page.'
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

interface FleetGraphFindingOwnerSelectionInput {
  ownerId?: string;
}

async function applyFleetGraphFinding(id: string, input?: FleetGraphFindingOwnerSelectionInput) {
  const response = input
    ? await apiPost(`/api/fleetgraph/findings/${id}/apply`, input)
    : await apiPost(`/api/fleetgraph/findings/${id}/apply`);
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

async function reviewFleetGraphFinding(id: string, input?: FleetGraphFindingOwnerSelectionInput) {
  const response = input
    ? await apiPost(`/api/fleetgraph/findings/${id}/review`, input)
    : await apiPost(`/api/fleetgraph/findings/${id}/review`);
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

interface FleetGraphSnoozeInput {
  minutes?: number
  seconds?: number
}

async function snoozeFleetGraphFinding(id: string, input: FleetGraphSnoozeInput) {
  const response = await apiPost(`/api/fleetgraph/findings/${id}/snooze`, input);
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
    mutationFn: ({ id, input }: { id: string; input?: FleetGraphFindingOwnerSelectionInput }) =>
      applyFleetGraphFinding(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['document'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input?: FleetGraphFindingOwnerSelectionInput }) =>
      reviewFleetGraphFinding(id, input),
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FleetGraphSnoozeInput }) =>
      snoozeFleetGraphFinding(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    async applyFinding(id: string, input?: FleetGraphFindingOwnerSelectionInput) {
      return applyMutation.mutateAsync({ id, input });
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
    async reviewFinding(id: string, input?: FleetGraphFindingOwnerSelectionInput) {
      return reviewMutation.mutateAsync({ id, input });
    },
    async refetchFindings() {
      return query.refetch();
    },
    async snoozeFinding(id: string, input: FleetGraphSnoozeInput = { minutes: 240 }) {
      return snoozeMutation.mutateAsync({ id, input });
    },
  };
}
