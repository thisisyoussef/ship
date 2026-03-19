import { useMutation } from '@tanstack/react-query'

import { apiPost } from '@/lib/api'
import {
  buildFleetGraphEntryPayload,
  type FleetGraphEntryInput,
  type FleetGraphEntryResponse,
} from '@/lib/fleetgraph-entry'

export function useFleetGraphEntry() {
  const mutation = useMutation({
    mutationFn: async (entry: FleetGraphEntryInput) => {
      const response = await apiPost(
        '/api/fleetgraph/entry',
        buildFleetGraphEntryPayload(entry)
      )

      if (!response.ok) {
        let message = 'FleetGraph could not review this page right now.'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            message = data.error
          }
        } catch {
          // Keep default message when the payload is missing.
        }
        throw new Error(message)
      }

      return response.json() as Promise<FleetGraphEntryResponse>
    },
  })

  return {
    checkCurrentContext(entry: FleetGraphEntryInput) {
      mutation.mutate(entry)
    },
    dismissEntry() {
      mutation.reset()
    },
    errorMessage: mutation.error instanceof Error ? mutation.error.message : null,
    isLoading: mutation.isPending,
    result: mutation.data,
  }
}
