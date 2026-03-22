import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiPost } from '@/lib/api'
import {
  buildFleetGraphEntryPayload,
  type FleetGraphEntryApplyResponse,
  type FleetGraphApprovalEnvelope,
  type FleetGraphEntryInput,
  type FleetGraphEntryResponse,
} from '@/lib/fleetgraph-entry'
import { documentKeys } from './useDocumentsQuery'
import { sprintKeys } from './useWeeksQuery'

export function useFleetGraphEntry() {
  const queryClient = useQueryClient()
  const [actionResult, setActionResult] = useState<FleetGraphEntryApplyResponse | null>(null)
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
    mutationFn: async (input: {
      approval: FleetGraphApprovalEnvelope
      threadId: string
    }) => {
      const response = await apiPost('/api/fleetgraph/entry/apply', {
        threadId: input.threadId,
      })
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
      return {
        approval: input.approval,
        result: await response.json() as FleetGraphEntryApplyResponse,
      }
    },
    onSuccess: ({ approval, result }) => {
      setActionResult(result)
      mutation.reset()
      // Invalidate relevant queries based on the action type
      if (approval.targetType === 'sprint') {
        queryClient.invalidateQueries({ queryKey: sprintKeys.lists() })
        queryClient.invalidateQueries({ queryKey: sprintKeys.active() })
      }
      if (approval.targetType === 'project') {
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      }
      // Always invalidate document details for the target
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(approval.targetId) })
    },
  })

  return {
    actionResult,
    applyApproval(threadId: string, approval: FleetGraphApprovalEnvelope) {
      setActionResult(null)
      applyMutation.mutate({ approval, threadId })
    },
    checkCurrentContext(entry: FleetGraphEntryInput) {
      setActionResult(null)
      mutation.mutate({ entry, previewApproval: false })
    },
    dismissApproval() {
      setActionResult(null)
      mutation.reset()
    },
    errorMessage:
      (mutation.error instanceof Error ? mutation.error.message : null)
      ?? (applyMutation.error instanceof Error ? applyMutation.error.message : null),
    isApplying: applyMutation.isPending,
    isLoading: mutation.isPending,
    previewApproval(entry: FleetGraphEntryInput) {
      setActionResult(null)
      mutation.mutate({ entry, previewApproval: true })
    },
    result: mutation.data,
    snoozeApproval() {
      setActionResult(null)
      mutation.reset()
    },
  }
}
