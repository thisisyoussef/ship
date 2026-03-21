import { useCallback, useRef, useState } from 'react'

import { apiPost } from '@/lib/api'
import type { AnalysisContext } from '@/lib/analysis-context-adapter'

export interface AnalysisChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{
    name: string
    args: Record<string, unknown>
    result: string
    duration_ms: number
  }>
  verification?: {
    claims_grounded: boolean
    evidence_sources: string[]
  }
  actionSuggestions?: Array<{
    action: string
    target_id: string
    target_type: string
    label: string
    rationale: string
  }>
  suggestedFollowups?: string[]
  timestamp: string
}

interface AnalysisChatResponse {
  response: string
  tool_calls: Array<{
    name: string
    args: Record<string, unknown>
    result: string
    duration_ms: number
  }>
  session_id: string
  request_id: string
  verification: {
    claims_grounded: boolean
    tool_calls_audited: number
    tool_calls_passed: number
    evidence_sources: string[]
  }
  action_suggestions: Array<{
    action: string
    target_id: string
    target_type: string
    label: string
    rationale: string
  }>
  is_error: boolean
  error_type: string | null
  suggested_followups: string[]
}

export function useAnalysisChat() {
  const [messages, setMessages] = useState<AnalysisChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string>(crypto.randomUUID())
  const contextRef = useRef<AnalysisContext | null>(null)

  const sendChat = useCallback(
    async (message: string, context: AnalysisContext) => {
      contextRef.current = context
      setIsLoading(true)
      setError(null)

      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        },
      ])

      try {
        const response = await apiPost('/api/analysis-agent/chat', {
          session_id: sessionIdRef.current,
          message,
          context,
        })

        if (response.status === 401) {
          throw new Error('Your session has expired. Please refresh the page to continue.')
        }

        if (!response.ok) {
          throw new Error('Analysis request failed')
        }

        const data = (await response.json()) as AnalysisChatResponse
        sessionIdRef.current = data.session_id

        // Add assistant message
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.response,
            toolCalls:
              data.tool_calls.length > 0 ? data.tool_calls : undefined,
            verification: {
              claims_grounded: data.verification.claims_grounded,
              evidence_sources: data.verification.evidence_sources,
            },
            actionSuggestions: data.action_suggestions?.length > 0 ? data.action_suggestions : undefined,
            suggestedFollowups:
              data.suggested_followups.length > 0
                ? data.suggested_followups
                : undefined,
            timestamp: new Date().toISOString(),
          },
        ])

        setSuggestedFollowups(data.suggested_followups)

        if (data.is_error) {
          setError(data.error_type ?? 'Unknown error')
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Request failed'
        setError(errorMsg)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I encountered an error: ${errorMsg}`,
            timestamp: new Date().toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const analyze = useCallback(
    (documentId: string, documentType: string, documentTitle: string) => {
      const context: AnalysisContext = {
        surface: 'analysis',
        entity_type: documentType,
        entity_id: documentId,
        entity_title: documentTitle,
      }
      return sendChat(
        `Analyze this ${documentType} and tell me what's important.`,
        context
      )
    },
    [sendChat]
  )

  const sendMessage = useCallback(
    (message: string) => {
      if (!contextRef.current) return
      return sendChat(message, contextRef.current)
    },
    [sendChat]
  )

  const askFollowup = useCallback(
    (followup: string) => {
      if (!contextRef.current) return
      return sendChat(followup, contextRef.current)
    },
    [sendChat]
  )

  const reset = useCallback(() => {
    setMessages([])
    setIsLoading(false)
    setSuggestedFollowups([])
    setError(null)
    sessionIdRef.current = crypto.randomUUID()
    contextRef.current = null
  }, [])

  return {
    messages,
    isLoading,
    suggestedFollowups,
    error,
    analyze,
    sendMessage,
    askFollowup,
    reset,
  }
}
