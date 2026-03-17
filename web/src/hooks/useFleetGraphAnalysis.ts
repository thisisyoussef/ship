import { useMutation } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { apiPost } from '@/lib/api'

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

  const reset = useCallback(() => {
    setThreadId(null)
    setConversation([])
  }, [])

  return {
    analyze,
    conversation,
    isAnalyzing: analyzeMutation.isPending,
    isResponding: turnMutation.isPending,
    reset,
    sendMessage,
    threadId,
  }
}
