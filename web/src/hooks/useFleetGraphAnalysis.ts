import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { apiPost } from '@/lib/api'
import type {
  FleetGraphActionDraft,
  FleetGraphDialogSpec,
  FleetGraphReasonedFinding,
  FleetGraphResponsePayload,
  FleetGraphThreadResponse,
} from '@/lib/fleetgraph-entry'
import { documentKeys } from './useDocumentsQuery'
import { sprintKeys } from './useWeeksQuery'

export interface FleetGraphThreadActionReviewResponse {
  actionDraft: FleetGraphActionDraft
  dialogSpec: FleetGraphDialogSpec
  threadId: string
  validationError?: string
}

export interface FleetGraphThreadActionApplyResponse {
  actionDraft: FleetGraphActionDraft
  actionResult: {
    endpoint: string
    errorMessage?: string
    executedAt: string
    method?: string
    path?: string
    responseBody?: unknown
    statusCode: number
    success: boolean
  }
  approvalDecision?: 'approved' | 'dismissed' | 'snoozed' | null
  responsePayload?: FleetGraphResponsePayload | null
  threadId: string
}

export interface ConversationEntry {
  actionDrafts?: FleetGraphActionDraft[]
  content: string
  findings?: FleetGraphReasonedFinding[]
  role: 'assistant' | 'user'
  timestamp: string
}

function readResponseText(payload: FleetGraphResponsePayload) {
  switch (payload.type) {
    case 'chat_answer':
      return payload.answer.text
    case 'degraded':
      return payload.partialAnswer?.text ?? payload.disclaimer
    case 'insight_cards':
      return payload.cards.map((card) => card.body).join('\n\n')
    default:
      return 'FleetGraph did not find anything that needs immediate attention.'
  }
}

export function useFleetGraphAnalysis() {
  const queryClient = useQueryClient()
  const [threadId, setThreadId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [currentReview, setCurrentReview] = useState<FleetGraphThreadActionReviewResponse | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const analyzeMutation = useMutation({
    mutationFn: async (input: {
      documentId: string
      documentTitle: string
      documentType: string
    }) => {
      const response = await apiPost('/api/fleetgraph/analyze', input)
      if (!response.ok) {
        throw new Error('FleetGraph analysis failed')
      }
      return response.json() as Promise<FleetGraphThreadResponse>
    },
    onSuccess: (data) => {
      setThreadId(data.threadId)
      setCurrentReview(null)
      setActionNotice(null)
      setApplyError(null)
      setConversation([
        {
          actionDrafts: data.actionDrafts,
          content: readResponseText(data.responsePayload),
          findings: data.reasonedFindings,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        },
      ])
    },
  })

  const turnMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!threadId) {
        throw new Error('No active session')
      }
      const response = await apiPost(
        `/api/fleetgraph/thread/${encodeURIComponent(threadId)}/turn`,
        { message }
      )
      if (!response.ok) {
        throw new Error('FleetGraph follow-up failed')
      }
      return response.json() as Promise<FleetGraphThreadResponse>
    },
    onMutate: (message) => {
      setConversation((prev) => [
        ...prev,
        {
          content: message,
          role: 'user',
          timestamp: new Date().toISOString(),
        },
      ])
    },
    onSuccess: (data) => {
      setCurrentReview(null)
      setActionNotice(null)
      setApplyError(null)
      setConversation((prev) => [
        ...prev,
        {
          actionDrafts: data.actionDrafts,
          content: readResponseText(data.responsePayload),
          findings: data.reasonedFindings,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        },
      ])
    },
  })

  const reviewActionMutation = useMutation({
    mutationFn: async (actionDraft: FleetGraphActionDraft) => {
      if (!threadId) {
        throw new Error('FleetGraph could not find an active analysis thread for this action.')
      }

      const response = await apiPost(
        `/api/fleetgraph/thread/${encodeURIComponent(threadId)}/actions/${encodeURIComponent(actionDraft.actionId)}/review`
      )
      if (!response.ok) {
        let message = 'FleetGraph could not prepare that review right now.'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            message = data.error
          }
        } catch {
          // Keep the default message.
        }
        throw new Error(message)
      }
      return response.json() as Promise<FleetGraphThreadActionReviewResponse>
    },
    onMutate: (actionDraft) => {
      setActionNotice(null)
      setApplyError(null)
      setPendingActionId(actionDraft.actionId)
    },
    onSuccess: (data) => {
      setCurrentReview(data)
    },
    onSettled: () => {
      setPendingActionId(null)
    },
  })

  const applyActionMutation = useMutation({
    mutationFn: async (payload: {
      actionDraft: FleetGraphActionDraft
      values: Record<string, string | string[] | null>
    }) => {
      if (!threadId) {
        throw new Error('FleetGraph could not find an active analysis thread for this action.')
      }

      const response = await apiPost(
        `/api/fleetgraph/thread/${encodeURIComponent(threadId)}/actions/${encodeURIComponent(payload.actionDraft.actionId)}/apply`,
        { values: payload.values }
      )
      if (!response.ok) {
        let message = 'FleetGraph could not apply this action right now.'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            message = data.error
          }
        } catch {
          // Keep the default message.
        }
        throw new Error(message)
      }
      return response.json() as Promise<FleetGraphThreadActionApplyResponse>
    },
    onMutate: ({ actionDraft }) => {
      setActionNotice(null)
      setApplyError(null)
      setPendingActionId(actionDraft.actionId)
    },
    onSuccess: (data) => {
      setCurrentReview(null)
      if (!data.actionResult.success) {
        setApplyError(data.actionResult.errorMessage ?? 'FleetGraph could not apply this action.')
        return
      }

      const notice = data.responsePayload
        ? readResponseText(data.responsePayload)
        : `FleetGraph applied ${data.actionDraft.actionType}.`
      setActionNotice(notice)

      if (data.actionDraft.targetType === 'sprint') {
        queryClient.invalidateQueries({ queryKey: sprintKeys.active() })
        queryClient.invalidateQueries({ queryKey: sprintKeys.lists() })
      }
      if (data.actionDraft.targetType === 'project') {
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      }
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(data.actionDraft.targetId) })
    },
    onSettled: () => {
      setPendingActionId(null)
    },
  })

  const analyze = useCallback(
    (documentId: string, documentType: string, documentTitle: string) => {
      analyzeMutation.mutate({ documentId, documentTitle, documentType })
    },
    [analyzeMutation]
  )

  const sendMessage = useCallback(
    (message: string) => {
      turnMutation.mutate(message)
    },
    [turnMutation]
  )

  const requestActionReview = useCallback(
    (actionDraft: FleetGraphActionDraft) => {
      reviewActionMutation.mutate(actionDraft)
    },
    [reviewActionMutation]
  )

  const applyReviewedAction = useCallback(
    (values: Record<string, string | string[] | null>) => {
      if (!currentReview) {
        return
      }
      applyActionMutation.mutate({
        actionDraft: currentReview.actionDraft,
        values,
      })
    },
    [applyActionMutation, currentReview]
  )

  const dismissActionReview = useCallback(() => {
    setCurrentReview(null)
    setPendingActionId(null)
    reviewActionMutation.reset()
    applyActionMutation.reset()
  }, [applyActionMutation, reviewActionMutation])

  const reset = useCallback(() => {
    setActionNotice(null)
    setApplyError(null)
    setConversation([])
    setCurrentReview(null)
    setThreadId(null)
  }, [])

  return {
    actionNotice,
    analyze,
    applyError,
    applyReviewedAction,
    conversation,
    currentReview,
    dismissActionReview,
    isAnalyzing: analyzeMutation.isPending,
    isApplying: applyActionMutation.isPending,
    isResponding: turnMutation.isPending,
    isReviewing: reviewActionMutation.isPending,
    pendingActionId,
    requestActionReview,
    reset,
    sendMessage,
    threadId,
  }
}
