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
import { documentContextKeys } from './useDocumentContextQuery'
import { documentKeys } from './useDocumentsQuery'
import { sprintKeys } from './useWeeksQuery'

export function useFleetGraphEntry() {
  const queryClient = useQueryClient()
  const [actionResult, setActionResult] = useState<FleetGraphEntryApplyResponse | null>(null)

  function invalidateDocumentSurface(documentId: string) {
    queryClient.invalidateQueries({ queryKey: ['document', documentId] })
    queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) })
    queryClient.invalidateQueries({ queryKey: documentContextKeys.detail(documentId) })
  }

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
      currentDocumentId: string
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
        currentDocumentId: input.currentDocumentId,
        result: await response.json() as FleetGraphEntryApplyResponse,
      }
    },
    onSuccess: ({ approval, currentDocumentId, result }) => {
      setActionResult(result)
      mutation.reset()
      // Invalidate relevant queries based on the action type
      if (approval.targetType === 'sprint') {
        queryClient.invalidateQueries({ queryKey: sprintKeys.lists() })
        queryClient.invalidateQueries({ queryKey: sprintKeys.active() })
        queryClient.invalidateQueries({ queryKey: sprintKeys.detail(approval.targetId) })
      }
      if (approval.targetType === 'project') {
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      }
      invalidateDocumentSurface(approval.targetId)
      if (currentDocumentId !== approval.targetId) {
        invalidateDocumentSurface(currentDocumentId)
      }
    },
  })

  return {
    actionResult,
    applyApproval(
      threadId: string,
      approval: FleetGraphApprovalEnvelope,
      currentDocumentId: string
    ) {
      setActionResult(null)
      applyMutation.mutate({ approval, currentDocumentId, threadId })
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
