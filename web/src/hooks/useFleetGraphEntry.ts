import { useMutation } from '@tanstack/react-query'

import { apiDelete, apiPatch, apiPost } from '@/lib/api'
import {
  buildFleetGraphEntryPayload,
  type FleetGraphApprovalEnvelope,
  type FleetGraphEntryInput,
  type FleetGraphEntryResponse,
} from '@/lib/fleetgraph-entry'

async function callApprovalEndpoint(approval: FleetGraphApprovalEnvelope): Promise<Response> {
  const { method, path } = approval.endpoint
  if (method === 'DELETE') return apiDelete(path)
  if (method === 'PATCH') return apiPatch(path, {})
  return apiPost(path, {})
}

export function useFleetGraphEntry() {
  const mutation = useMutation({
    mutationFn: async (input: {
      entry: FleetGraphEntryInput
      previewApproval: boolean
    }) => {
      const response = await apiPost(
        '/api/fleetgraph/entry',
        buildFleetGraphEntryPayload(input.entry, input.previewApproval)
      )

      if (!response.ok) {
        let message = 'FleetGraph could not review this page right now.'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            message = data.error
          }
        } catch {
          // Keep the default message when the error payload is missing.
        }
        throw new Error(message)
      }

      return response.json() as Promise<FleetGraphEntryResponse>
    },
  })

  const applyMutation = useMutation({
    mutationFn: async (approval: FleetGraphApprovalEnvelope) => {
      const response = await callApprovalEndpoint(approval)
      if (!response.ok) {
        let message = 'FleetGraph could not apply this action right now.'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            message = data.error
          }
        } catch {
          // Keep the default message when the error payload is missing.
        }
        throw new Error(message)
      }
    },
    onSuccess: () => {
      mutation.reset()
    },
  })

  return {
    applyApproval(approval: FleetGraphApprovalEnvelope) {
      applyMutation.mutate(approval)
    },
    checkCurrentContext(entry: FleetGraphEntryInput) {
      mutation.mutate({ entry, previewApproval: false })
    },
    dismissApproval() {
      mutation.reset()
    },
    errorMessage:
      (mutation.error instanceof Error ? mutation.error.message : null)
      ?? (applyMutation.error instanceof Error ? applyMutation.error.message : null),
    isApplying: applyMutation.isPending,
    isLoading: mutation.isPending,
    previewApproval(entry: FleetGraphEntryInput) {
      mutation.mutate({ entry, previewApproval: true })
    },
    result: mutation.data,
    snoozeApproval() {
      mutation.reset()
    },
  }
}
