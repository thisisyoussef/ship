import { useEffect, useRef, useState } from 'react'

import { useAnalysisChat } from '@/hooks/useAnalysisChat'
import { apiPost } from '@/lib/api'

interface AnalysisSectionProps {
  documentId: string
  documentTitle: string
  documentType: string
}

export function AnalysisSection({
  documentId,
  documentTitle,
  documentType,
}: AnalysisSectionProps) {
  const {
    messages,
    isLoading,
    error,
    analyze,
    sendMessage,
    askFollowup,
  } = useAnalysisChat()

  const [input, setInput] = useState('')
  const hasAnalyzedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expandedTool, setExpandedTool] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    action: string
    target_id: string
    target_type: string
    label: string
    rationale: string
  } | null>(null)
  const [actionStatus, setActionStatus] = useState<'idle' | 'confirming' | 'executing' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (!hasAnalyzedRef.current && documentId) {
      hasAnalyzedRef.current = true
      analyze(documentId, documentType, documentTitle)
    }
  }, [analyze, documentId, documentTitle, documentType])

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        behavior: 'smooth',
        top: scrollRef.current.scrollHeight,
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages.length, isLoading])

  const handleSend = () => {
    const message = input.trim()
    if (!message || isLoading) return
    sendMessage(message)
    setInput('')
  }

  const handleActionClick = (action: typeof pendingAction) => {
    setPendingAction(action)
    setActionStatus('confirming')
  }

  const handleActionConfirm = async () => {
    if (!pendingAction) return
    setActionStatus('executing')

    try {
      const response = await apiPost(`/api/fleetgraph/actions/execute`, {
        action_type: pendingAction.action,
        target_id: pendingAction.target_id,
        target_type: pendingAction.target_type,
      })

      if (!response.ok) {
        throw new Error('Action failed')
      }

      setActionStatus('done')
      sendMessage(`I just applied "${pendingAction.label}". What's the current status now?`)
    } catch {
      setActionStatus('error')
    } finally {
      setTimeout(() => {
        setPendingAction(null)
        setActionStatus('idle')
      }, 2000)
    }
  }

  const handleActionCancel = () => {
    setPendingAction(null)
    setActionStatus('idle')
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            key={`${msg.role}-${msg.timestamp}-${i}`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl bg-accent px-3 py-2 text-sm leading-6 text-white">
                {msg.content}
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="rounded-2xl border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground shadow-sm">
                  {msg.content}
                </div>

                {/* Tool calls */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {msg.toolCalls.map((tc, j) => {
                        const chipKey = `${i}-${tc.name}-${j}`
                        const isExpanded = expandedTool === chipKey
                        return (
                          <button
                            key={chipKey}
                            type="button"
                            className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] transition-colors ${
                              isExpanded
                                ? 'border-accent/30 bg-accent/5 text-accent'
                                : 'border-border bg-background text-muted hover:border-accent/20 hover:text-foreground'
                            }`}
                            onClick={() => setExpandedTool(isExpanded ? null : chipKey)}
                          >
                            {tc.name} ({tc.duration_ms}ms)
                          </button>
                        )
                      })}
                    </div>
                    {/* Expanded tool detail */}
                    {msg.toolCalls.map((tc, j) => {
                      const chipKey = `${i}-${tc.name}-${j}`
                      if (expandedTool !== chipKey) return null
                      return (
                        <div key={`detail-${chipKey}`} className="rounded-lg border border-border bg-background/50 p-2 text-[11px]">
                          <div className="mb-1 font-medium text-foreground">Args:</div>
                          <pre className="mb-2 overflow-x-auto whitespace-pre-wrap text-muted">
                            {JSON.stringify(tc.args, null, 2)}
                          </pre>
                          <div className="mb-1 font-medium text-foreground">Result:</div>
                          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap text-muted">
                            {(() => {
                              try { return JSON.stringify(JSON.parse(tc.result), null, 2) }
                              catch { return tc.result }
                            })()}
                          </pre>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Verification */}
                {msg.verification && (
                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    <span
                      className={
                        msg.verification.claims_grounded
                          ? 'font-medium text-green-600'
                          : 'font-medium text-amber-600'
                      }
                    >
                      {msg.verification.claims_grounded
                        ? 'Grounded'
                        : 'Unverified'}
                    </span>
                    {msg.verification.evidence_sources.length > 0 && (
                      <span>
                        &middot; {msg.verification.evidence_sources.length}{' '}
                        sources
                      </span>
                    )}
                  </div>
                )}

                {/* Action suggestions */}
                {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                  <div className="space-y-1.5 rounded-xl border border-accent/20 bg-accent/5 p-2.5">
                    <div className="text-[11px] font-medium text-accent">Suggested Actions</div>
                    {msg.actionSuggestions.map((action, k) => (
                      <div key={`action-${k}`} className="flex items-start gap-2">
                        <button
                          type="button"
                          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-accent/90"
                          onClick={() => handleActionClick(action)}
                        >
                          {action.label}
                        </button>
                        <span className="pt-0.5 text-[11px] text-muted">{action.rationale}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested followups (only on last message) */}
                {i === messages.length - 1 &&
                  msg.suggestedFollowups &&
                  msg.suggestedFollowups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedFollowups.map((fu, k) => (
                        <button
                          className="rounded-full border border-accent/20 px-2.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent/5"
                          key={`followup-${k}`}
                          onClick={() => askFollowup(fu)}
                          type="button"
                        >
                          {fu}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
            Analyzing...
          </div>
        )}
      </div>

      {error && <p className="py-2 text-xs text-red-600">{error}</p>}

      {/* Input */}
      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <input
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask a follow-up..."
          type="text"
          value={input}
        />
        <button
          className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading || !input.trim()}
          onClick={handleSend}
          type="button"
        >
          Send
        </button>
      </div>

      {/* Action confirmation dialog */}
      {pendingAction && actionStatus === 'confirming' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-background p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-foreground">Confirm Action</h3>
            <p className="mt-1 text-xs text-muted">{pendingAction.rationale}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90"
                onClick={handleActionConfirm}
              >
                {pendingAction.label}
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/10"
                onClick={handleActionCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action executing indicator */}
      {actionStatus === 'executing' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-xl">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
            <span className="text-sm text-foreground">Applying action...</span>
          </div>
        </div>
      )}

      {actionStatus === 'done' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-background px-4 py-3 shadow-xl">
            <span className="text-green-500">&#10003;</span>
            <span className="text-sm text-foreground">Action applied successfully</span>
          </div>
        </div>
      )}

      {actionStatus === 'error' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-background px-4 py-3 shadow-xl">
            <span className="text-red-500">&#10007;</span>
            <span className="text-sm text-foreground">Action failed — try again</span>
          </div>
        </div>
      )}
    </div>
  )
}
