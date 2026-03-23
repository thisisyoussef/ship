import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiPost } from '@/lib/api'
import {
  type FleetGraphEntryAnalysisFinding,
  buildFleetGraphEntryPayload,
  buildFleetGraphNoPreviewResponse,
  buildFleetGraphPreviewThreadId,
  type FleetGraphEntryApplyResponse,
  type FleetGraphApprovalEnvelope,
  type FleetGraphEntryInput,
  type FleetGraphEntryResponse,
  type FleetGraphRequestedActionDraft,
} from '@/lib/fleetgraph-entry'
import { documentContextKeys } from './useDocumentContextQuery'
import { documentKeys } from './useDocumentsQuery'
import { sprintKeys } from './useWeeksQuery'

export interface FleetGraphEntryConversationEntry {
  content: string
  findings?: FleetGraphEntryAnalysisFinding[]
  role: 'user' | 'assistant'
  timestamp: string
}

function buildAnalysisThreadId(entry: FleetGraphEntryInput) {
  const sessionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`
  return [
    'fleetgraph',
    entry.document.workspaceId ?? 'workspace',
    'entry-analysis',
    entry.document.id,
    sessionId,
  ].join(':')
}

export function useFleetGraphEntry() {
  const queryClient = useQueryClient()
  const [actionResult, setActionResult] = useState<FleetGraphEntryApplyResponse | null>(null)
  const [analysisConversation, setAnalysisConversation] = useState<FleetGraphEntryConversationEntry[]>([])
  const [analysisThreadId, setAnalysisThreadId] = useState<string | null>(null)

  function invalidateDocumentSurface(documentId: string) {
    queryClient.invalidateQueries({ queryKey: ['document', documentId] })
    queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) })
    queryClient.invalidateQueries({ queryKey: documentContextKeys.detail(documentId) })
  }

  const mutation = useMutation({
    mutationFn: async (input: {
      entry: FleetGraphEntryInput
      previewApproval: boolean
      requestedAction?: FleetGraphRequestedActionDraft
      threadId?: string
    }) => {
      const payload = buildFleetGraphEntryPayload(
        input.entry,
        input.previewApproval,
        input.threadId,
        input.requestedAction
      )

      if (input.previewApproval && !payload.draft?.requestedAction) {
        return buildFleetGraphNoPreviewResponse(input.entry)
      }

      const response = await apiPost(
        '/api/fleetgraph/entry',
        payload
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
    onSuccess: (result, variables) => {
      if (variables.previewApproval || !result.analysis) {
        return
      }

      setAnalysisThreadId(result.entry.threadId)
      setAnalysisConversation([
        {
          content: result.analysis.text,
          findings: result.analysis.findings,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        },
      ])
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
      window.dispatchEvent(new CustomEvent('fleetgraph:entry-action-applied', {
        detail: {
          actionType: approval.type,
          currentDocumentId,
          targetId: approval.targetId,
          targetType: approval.targetType,
        },
      }))
    },
  })

  const followUpMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!analysisThreadId) {
        throw new Error('FleetGraph needs an active page-analysis thread first.')
      }

      const response = await apiPost(
        `/api/fleetgraph/thread/${encodeURIComponent(analysisThreadId)}/turn`,
        { message }
      )
      if (!response.ok) {
        let errorMessage = 'FleetGraph could not answer that follow-up right now.'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            errorMessage = data.error
          }
        } catch {
          // Keep the default message when the error payload is missing.
        }
        throw new Error(errorMessage)
      }

      return response.json() as Promise<{
        analysisFindings: FleetGraphEntryAnalysisFinding[]
        analysisText: string
      }>
    },
    onMutate: (message) => {
      setAnalysisConversation((current) => [
        ...current,
        {
          content: message,
          role: 'user',
          timestamp: new Date().toISOString(),
        },
      ])
    },
    onSuccess: (result) => {
      setAnalysisConversation((current) => [
        ...current,
        {
          content: result.analysisText,
          findings: result.analysisFindings,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        },
      ])
    },
  })

  return {
    actionResult,
    analysisConversation,
    analysisThreadId,
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
      setAnalysisConversation([])
      setAnalysisThreadId(null)
      mutation.mutate({
        entry,
        previewApproval: false,
        threadId: buildAnalysisThreadId(entry),
      })
    },
    dismissApproval() {
      setActionResult(null)
      mutation.reset()
    },
    errorMessage:
      (mutation.error instanceof Error ? mutation.error.message : null)
      ?? (applyMutation.error instanceof Error ? applyMutation.error.message : null)
      ?? (followUpMutation.error instanceof Error ? followUpMutation.error.message : null),
    isApplying: applyMutation.isPending,
    isLoading: mutation.isPending,
    isResponding: followUpMutation.isPending,
    previewApproval(
      entry: FleetGraphEntryInput,
      requestedAction?: FleetGraphRequestedActionDraft
    ) {
      setActionResult(null)
      mutation.mutate({
        entry,
        previewApproval: true,
        requestedAction,
        threadId: requestedAction
          ? buildFleetGraphPreviewThreadId(entry, requestedAction)
          : undefined,
      })
    },
    reset() {
      setActionResult(null)
      setAnalysisConversation([])
      setAnalysisThreadId(null)
      mutation.reset()
      applyMutation.reset()
      followUpMutation.reset()
    },
    result: mutation.data,
    sendAnalysisFollowUp(message: string) {
      followUpMutation.mutate(message)
    },
    snoozeApproval() {
      setActionResult(null)
      mutation.reset()
    },
  }
}
