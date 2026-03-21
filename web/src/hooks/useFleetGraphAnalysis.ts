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
import { documentContextKeys } from './useDocumentContextQuery'
import { documentKeys } from './useDocumentsQuery'
import { sprintKeys } from './useWeeksQuery'

const USE_CHAT_ORCHESTRATOR = Boolean(
  (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__FLEETGRAPH_CHAT_ORCHESTRATOR__) ||
  import.meta.env.VITE_FLEETGRAPH_CHAT_ORCHESTRATOR === 'true'
)

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

interface AnalysisRequest {
  documentId: string
  documentTitle: string
  documentType: string
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

function buildAssistantConversationEntry(
  data: FleetGraphThreadResponse
): ConversationEntry {
  return {
    actionDrafts: data.actionDrafts,
    content: readResponseText(data.responsePayload),
    findings: data.reasonedFindings,
    role: 'assistant',
    timestamp: new Date().toISOString(),
  }
}

function retireCompletedAction(
  conversation: ConversationEntry[],
  actionId: string
) {
  return conversation.map((entry) => {
    if (!entry.actionDrafts?.some((draft) => draft.actionId === actionId)) {
      return entry
    }

    return {
      ...entry,
      actionDrafts: entry.actionDrafts.filter((draft) => draft.actionId !== actionId),
    }
  })
}

export function useFleetGraphAnalysis() {
  const queryClient = useQueryClient()
  const [threadId, setThreadId] = useState<string | null>(null)
  const [analysisRequest, setAnalysisRequest] = useState<AnalysisRequest | null>(null)
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [currentReview, setCurrentReview] = useState<FleetGraphThreadActionReviewResponse | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const postAnalyze = useCallback(async (input: AnalysisRequest) => {
    const endpoint = USE_CHAT_ORCHESTRATOR
      ? '/api/fleetgraph/chat/start'
      : '/api/fleetgraph/analyze'
    const response = await apiPost(endpoint, input)
    if (!response.ok) {
      throw new Error('FleetGraph analysis failed')
    }
    return response.json() as Promise<FleetGraphThreadResponse>
  }, [])

  const analyzeMutation = useMutation({
    mutationFn: postAnalyze,
    onMutate: (input) => {
      setAnalysisRequest(input)
    },
    onSuccess: (data, input) => {
      setAnalysisRequest(input)
      setThreadId(data.threadId)
      setCurrentReview(null)
      setApplyError(null)
      setConversation([buildAssistantConversationEntry(data)])
    },
  })

  const continueAnalysisMutation = useMutation({
    mutationFn: postAnalyze,
    onSuccess: (data) => {
      setThreadId(data.threadId)
      setApplyError(null)
      setConversation((prev) => [...prev, buildAssistantConversationEntry(data)])
    },
    onError: () => {
      setApplyError('FleetGraph applied the change, but could not refresh the next recommendation.')
    },
  })

  const turnMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!threadId) {
        throw new Error('No active session')
      }
      const endpoint = USE_CHAT_ORCHESTRATOR
        ? `/api/fleetgraph/chat/${encodeURIComponent(threadId)}/message`
        : `/api/fleetgraph/thread/${encodeURIComponent(threadId)}/turn`
      const response = await apiPost(endpoint, { message })
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
      setApplyError(null)
      setConversation((prev) => [
        ...prev,
        buildAssistantConversationEntry(data),
      ])
    },
  })

  const reviewActionMutation = useMutation({
    mutationFn: async (actionDraft: FleetGraphActionDraft) => {
      if (!threadId) {
        throw new Error('FleetGraph could not find an active analysis thread for this action.')
      }

      // In chat orchestrator mode, the pending approval already includes
      // the dialog spec from the chat response -- no separate review call needed.
      if (USE_CHAT_ORCHESTRATOR) {
        // Find the pending approval from the latest conversation entry
        const lastEntry = conversation[conversation.length - 1]
        const pendingDraft = lastEntry?.actionDrafts?.find(d => d.actionId === actionDraft.actionId)
        return {
          actionDraft: pendingDraft ?? actionDraft,
          dialogSpec: {} as FleetGraphDialogSpec,
          threadId,
        } as FleetGraphThreadActionReviewResponse
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

      if (USE_CHAT_ORCHESTRATOR) {
        const response = await apiPost(
          `/api/fleetgraph/chat/${encodeURIComponent(threadId)}/approve`,
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
        // Map chat response back to the expected apply response shape
        const chatResponse = await response.json() as FleetGraphThreadResponse
        return {
          actionDraft: payload.actionDraft,
          actionResult: {
            endpoint: 'chat_orchestrator',
            executedAt: new Date().toISOString(),
            statusCode: 200,
            success: true,
          },
          responsePayload: chatResponse.responsePayload,
          threadId: chatResponse.threadId,
        } as FleetGraphThreadActionApplyResponse
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
      setApplyError(null)
      setPendingActionId(actionDraft.actionId)
    },
    onSuccess: (data) => {
      setCurrentReview(null)
      if (!data.actionResult.success) {
        setApplyError(data.actionResult.errorMessage ?? 'FleetGraph could not apply this action.')
        return
      }

      setConversation((prev) => {
        const nextConversation = retireCompletedAction(prev, data.actionDraft.actionId)
        const notice = data.responsePayload
          ? readResponseText(data.responsePayload)
          : 'FleetGraph completed the requested change in Ship.'

        return [
          ...nextConversation,
          {
            content: notice,
            role: 'assistant',
            timestamp: new Date().toISOString(),
          },
        ]
      })

      if (data.actionDraft.targetType === 'sprint') {
        queryClient.invalidateQueries({ queryKey: sprintKeys.active() })
        queryClient.invalidateQueries({ queryKey: sprintKeys.lists() })
      }
      if (data.actionDraft.targetType === 'project') {
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      }
      queryClient.invalidateQueries({ queryKey: ['document', data.actionDraft.targetId] })
      queryClient.invalidateQueries({
        queryKey: documentContextKeys.detail(data.actionDraft.targetId),
      })
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(data.actionDraft.targetId) })

      if (analysisRequest) {
        continueAnalysisMutation.mutate(analysisRequest)
      }
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

    // In chat orchestrator mode, notify the backend of the dismissal
    if (USE_CHAT_ORCHESTRATOR && threadId) {
      apiPost(`/api/fleetgraph/chat/${encodeURIComponent(threadId)}/dismiss`).catch(() => {
        // Best-effort dismiss notification
      })
    }
  }, [applyActionMutation, reviewActionMutation, threadId])

  const reset = useCallback(() => {
    setApplyError(null)
    setAnalysisRequest(null)
    setConversation([])
    setCurrentReview(null)
    setPendingActionId(null)
    setThreadId(null)
  }, [])

  return {
    analyze,
    applyError,
    applyReviewedAction,
    conversation,
    currentReview,
    dismissActionReview,
    isAnalyzing: analyzeMutation.isPending,
    isApplying: applyActionMutation.isPending,
    isContinuing: continueAnalysisMutation.isPending,
    isResponding: turnMutation.isPending,
    isReviewing: reviewActionMutation.isPending,
    pendingActionId,
    requestActionReview,
    reset,
    sendMessage,
    threadId,
  }
}
