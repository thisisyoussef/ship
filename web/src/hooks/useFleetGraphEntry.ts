import { useMutation } from '@tanstack/react-query'

import { apiPost } from '@/lib/api'
import {
  buildFleetGraphEntryPayload,
  type FleetGraphEntryInput,
  type FleetGraphEntryResponse,
} from '@/lib/fleetgraph-entry'

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
        let message = 'FleetGraph could not create an embedded entry.'
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

  return {
    checkCurrentContext(entry: FleetGraphEntryInput) {
      mutation.mutate({ entry, previewApproval: false })
    },
    errorMessage: mutation.error instanceof Error ? mutation.error.message : null,
    isLoading: mutation.isPending,
    previewApproval(entry: FleetGraphEntryInput) {
      mutation.mutate({ entry, previewApproval: true })
    },
    result: mutation.data,
  }
}
