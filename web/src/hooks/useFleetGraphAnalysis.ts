import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { apiPost } from '@/lib/api'
import { documentKeys } from './useDocumentsQuery'
import { sprintKeys } from './useWeeksQuery'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

// All FleetGraph action types (V1 + V2 additions)
export type FleetGraphActionType =
  | 'approve_project_plan'
  | 'approve_week_plan'
  | 'assign_issues'
  | 'assign_owner'
  | 'escalate_risk'
  | 'post_comment'
  | 'post_standup'
  | 'rebalance_load'
  | 'start_week'

export interface FleetGraphFinding {
  actionTier: 'A' | 'B' | 'C'
  evidence: string[]
  findingType: string
  proposedAction?: {
    actionId: string
    actionType: FleetGraphActionType | string // Allow any string for forward compatibility
    dialogKind: 'confirm'
    endpoint: { method: string; path: string }
    label: string
    reviewSummary: string
    reviewTitle: string
    targetId: string
    targetType: 'project' | 'sprint' | 'person' | 'document' // Extended for V2
  }
  severity: 'info' | 'warning' | 'critical'
  summary: string
  title: string
}

export interface FleetGraphThreadActionReview {
  cancelLabel: string
  confirmLabel: string
  evidence: string[]
  summary: string
  threadId: string
  title: string
}

export interface FleetGraphThreadActionReviewResponse {
  action: NonNullable<FleetGraphFinding['proposedAction']>
  review: FleetGraphThreadActionReview
}

export interface FleetGraphThreadActionApplyResponse {
  action: NonNullable<FleetGraphFinding['proposedAction']>
  actionOutcome: {
    message: string
    resultStatusCode?: number
    status: 'already_applied' | 'applied' | 'failed'
  }
}

export interface FleetGraphAnalysisResponse {
  analysisFindings: FleetGraphFinding[]
  analysisText: string
  outcome: string
  path: string[]
  pendingAction?: FleetGraphFinding['proposedAction']
  threadId: string
  turnCount?: number
}

export interface ConversationEntry {
  content: string
  findings?: FleetGraphFinding[]
  role: 'user' | 'assistant'
  timestamp: string
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useFleetGraphAnalysis() {
  const queryClient = useQueryClient()
  const [threadId, setThreadId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [currentReview, setCurrentReview] = useState<FleetGraphThreadActionReviewResponse | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Auto-analysis mutation
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
      return response.json() as Promise<FleetGraphAnalysisResponse>
    },
    onSuccess: (data) => {
      setThreadId(data.threadId)
      setCurrentReview(null)
      setActionNotice(null)
      setConversation([
        {
          content: data.analysisText,
          findings: data.analysisFindings,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        },
      ])
    },
  })

  // Follow-up turn mutation
  const turnMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!threadId) throw new Error('No active session')
      const response = await apiPost(
        `/api/fleetgraph/thread/${encodeURIComponent(threadId)}/turn`,
        { message }
      )
      if (!response.ok) {
        throw new Error('FleetGraph follow-up failed')
      }
      return response.json() as Promise<FleetGraphAnalysisResponse>
    },
    onMutate: (message) => {
      // Optimistically add user message
      setConversation((prev) => [
        ...prev,
        {
          content: message,
          role: 'user' as const,
          timestamp: new Date().toISOString(),
        },
      ])
    },
    onSuccess: (data) => {
      setCurrentReview(null)
      setActionNotice(null)
      setConversation((prev) => [
        ...prev,
        {
          content: data.analysisText,
          findings: data.analysisFindings,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        },
      ])
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

  const [pendingActionFindingId, setPendingActionFindingId] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const reviewActionMutation = useMutation({
    mutationFn: async (action: NonNullable<FleetGraphFinding['proposedAction']>) => {
      if (!threadId) {
        throw new Error('FleetGraph could not find an active analysis thread for this action.')
      }

      const response = await apiPost(
        `/api/fleetgraph/thread/${encodeURIComponent(threadId)}/actions/${encodeURIComponent(action.actionId)}/review`
      )
      if (!response.ok) {
        let message = 'FleetGraph could not prepare that review right now.'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            message = data.error
          }
        } catch {
          // Keep default message.
        }
        throw new Error(message)
      }
      return response.json() as Promise<FleetGraphThreadActionReviewResponse>
    },
    onMutate: (action) => {
      setApplyError(null)
      setActionNotice(null)
      setPendingActionFindingId(action.actionId)
    },
    onSuccess: (data) => {
      setCurrentReview(data)
    },
    onSettled: () => {
      setPendingActionFindingId(null)
    },
  })

  const applyActionMutation = useMutation({
    mutationFn: async (action: NonNullable<FleetGraphFinding['proposedAction']>) => {
      if (!threadId) {
        throw new Error('FleetGraph could not find an active analysis thread for this action.')
      }

      const response = await apiPost(
        `/api/fleetgraph/thread/${encodeURIComponent(threadId)}/actions/${encodeURIComponent(action.actionId)}/apply`
      )
      if (!response.ok) {
        let message = 'FleetGraph could not apply this action right now.'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            message = data.error
          }
        } catch {
          // Keep default message.
        }
        throw new Error(message)
      }
      return response.json() as Promise<FleetGraphThreadActionApplyResponse>
    },
    onMutate: (action) => {
      setApplyError(null)
      setActionNotice(null)
      setPendingActionFindingId(action.actionId)
    },
    onSuccess: (data) => {
      setCurrentReview(null)
      if (data.actionOutcome.status === 'failed') {
        setApplyError(data.actionOutcome.message)
        return
      }

      setActionNotice(data.actionOutcome.message)
      if (data.action.targetType === 'sprint') {
        queryClient.invalidateQueries({ queryKey: sprintKeys.lists() })
        queryClient.invalidateQueries({ queryKey: sprintKeys.active() })
      }
      if (data.action.targetType === 'project') {
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      }
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(data.action.targetId) })
    },
    onSettled: () => {
      setPendingActionFindingId(null)
    },
  })

  const requestActionReview = useCallback((finding: FleetGraphFinding) => {
    if (!finding.proposedAction) return
    reviewActionMutation.mutate(finding.proposedAction)
  }, [reviewActionMutation])

  const applyReviewedAction = useCallback(() => {
    if (!currentReview?.action) return
    applyActionMutation.mutate(currentReview.action)
  }, [applyActionMutation, currentReview])

  const dismissActionReview = useCallback(() => {
    setCurrentReview(null)
    setPendingActionFindingId(null)
    reviewActionMutation.reset()
    applyActionMutation.reset()
  }, [applyActionMutation, reviewActionMutation])

  const reset = useCallback(() => {
    setThreadId(null)
    setConversation([])
    setCurrentReview(null)
    setActionNotice(null)
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
    isReviewing: reviewActionMutation.isPending,
    isResponding: turnMutation.isPending,
    pendingActionFindingId,
    requestActionReview,
    reset,
    sendMessage,
    threadId,
  }
}
