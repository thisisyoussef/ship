import { useMutation } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { apiDelete, apiPatch, apiPost } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface FleetGraphFinding {
  actionTier: 'A' | 'B' | 'C'
  evidence: string[]
  findingType: string
  proposedAction?: {
    endpoint: { method: string; path: string }
    label: string
    targetId: string
    targetType: string
  }
  severity: 'info' | 'warning' | 'critical'
  summary: string
  title: string
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
  const [threadId, setThreadId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationEntry[]>([])

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
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const applyFindingAction = useCallback(async (finding: FleetGraphFinding) => {
    if (!finding.proposedAction) return
    const key = `${finding.findingType}:${finding.title}`
    setApplyError(null)
    setPendingActionFindingId(key)
    setIsApplying(true)
    try {
      const { method, path } = finding.proposedAction.endpoint
      let response: Response
      const upperMethod = method.toUpperCase()
      if (upperMethod === 'POST') {
        response = await apiPost(path)
      } else if (upperMethod === 'PATCH') {
        response = await apiPatch(path, {})
      } else if (upperMethod === 'DELETE') {
        response = await apiDelete(path)
      } else {
        // Fallback to POST for unknown methods
        response = await apiPost(path)
      }
      if (!response.ok) {
        console.error(`FleetGraph action failed: ${response.status} ${response.statusText}`)
        setApplyError('Failed to apply this action. Please try again.')
      }
    } catch (err) {
      console.error('FleetGraph applyFindingAction error:', err)
      setApplyError('Failed to apply this action. Please try again.')
    } finally {
      setPendingActionFindingId(null)
      setIsApplying(false)
    }
  }, [])

  const reset = useCallback(() => {
    setThreadId(null)
    setConversation([])
  }, [])

  return {
    analyze,
    applyError,
    applyFindingAction,
    conversation,
    isAnalyzing: analyzeMutation.isPending,
    isApplying,
    isResponding: turnMutation.isPending,
    pendingActionFindingId,
    reset,
    sendMessage,
    threadId,
  }
}
