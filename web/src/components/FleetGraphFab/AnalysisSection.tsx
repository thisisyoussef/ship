import { useEffect, useRef, useState } from 'react'

import { useAnalysisChat } from '@/hooks/useAnalysisChat'

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

  useEffect(() => {
    if (!hasAnalyzedRef.current && documentId) {
      hasAnalyzedRef.current = true
      analyze(documentId, documentType, documentTitle)
    }
  }, [analyze, documentId, documentTitle, documentType])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: 'smooth',
      top: scrollRef.current.scrollHeight,
    })
  }, [messages.length])

  const handleSend = () => {
    const message = input.trim()
    if (!message || isLoading) return
    sendMessage(message)
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
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
                  <div className="flex flex-wrap gap-1">
                    {msg.toolCalls.map((tc, j) => (
                      <span
                        className="inline-flex items-center rounded-lg border border-border bg-background px-2 py-0.5 text-[11px] text-muted shadow-sm"
                        key={`${tc.name}-${j}`}
                      >
                        {tc.name} ({tc.duration_ms}ms)
                      </span>
                    ))}
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
    </div>
  )
}
