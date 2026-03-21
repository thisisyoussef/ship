import { useEffect, useRef, useState } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAnalysisChat } from '@/hooks/useAnalysisChat'
import { apiPost } from '@/lib/api'

const ACTION_INPUT_SPECS: Record<string, Array<{ key: string; label: string; placeholder: string; type: 'text' | 'textarea' }>> = {
  start_week: [],
  approve_week_plan: [],
  approve_project_plan: [],
  assign_owner: [
    { key: 'owner_name', label: 'Owner Name', placeholder: 'e.g. Alice Chen', type: 'text' },
  ],
  post_comment: [
    { key: 'content', label: 'Comment', placeholder: 'Write your comment...', type: 'textarea' },
  ],
  post_standup: [
    { key: 'content', label: 'Standup Update', placeholder: 'What did you work on? What are you working on next?', type: 'textarea' },
  ],
}

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
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInputs, setActionInputs] = useState<Record<string, string>>({})

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
    setActionInputs({})
    setActionStatus('confirming')
  }

  const handleActionConfirm = async () => {
    if (!pendingAction) return
    setActionStatus('executing')

    try {
      let response: Response
      const targetId = pendingAction.target_id

      switch (pendingAction.action) {
        case 'start_week':
          response = await apiPost(`/api/weeks/${targetId}/start`, {})
          break
        case 'approve_week_plan':
          response = await apiPost(`/api/weeks/${targetId}/approve-plan`, {})
          break
        case 'approve_project_plan':
          response = await apiPost(`/api/projects/${targetId}/approve-plan`, {})
          break
        case 'assign_owner': {
          const ownerName = actionInputs.owner_name?.trim()
          if (!ownerName) throw new Error('Please enter an owner name')
          response = await apiPost(`/api/weeks/${targetId}`, {
            method: 'PATCH',
            properties: { owner_id: ownerName },
          })
          break
        }
        case 'post_standup': {
          const content = actionInputs.content?.trim()
          if (!content) throw new Error('Please enter standup content')
          response = await apiPost(`/api/weeks/${targetId}/standups`, { content })
          break
        }
        case 'post_comment': {
          const content = actionInputs.content?.trim()
          if (!content) throw new Error('Please enter a comment')
          response = await apiPost(`/api/documents/${targetId}/comments`, { content })
          break
        }
        default:
          throw new Error(`Unknown action: ${pendingAction.action}`)
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(body || `Action failed (${response.status})`)
      }

      setActionStatus('done')
      const label = pendingAction.label
      setPendingAction(null)
      setActionInputs({})
      sendMessage(`I just applied "${label}". What's the current status now?`)
      setTimeout(() => setActionStatus('idle'), 1500)
    } catch (err) {
      setActionStatus('error')
      setActionError(err instanceof Error ? err.message : 'Action failed')
      setTimeout(() => {
        setPendingAction(null)
        setActionStatus('idle')
        setActionError(null)
        setActionInputs({})
      }, 3000)
    }
  }

  const handleActionCancel = () => {
    setPendingAction(null)
    setActionStatus('idle')
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

      {/* Action confirmation — uses Ship's ConfirmDialog (portals to document root) */}
      <ConfirmDialog
        open={pendingAction !== null && actionStatus === 'confirming'}
        title={pendingAction?.label ?? 'Confirm Action'}
        description={pendingAction?.rationale}
        confirmLabel={pendingAction?.label ?? 'Apply'}
        cancelLabel="Cancel"
        confirmDisabled={actionStatus === 'executing' || (
          (ACTION_INPUT_SPECS[pendingAction?.action ?? ''] ?? []).length > 0 &&
          (ACTION_INPUT_SPECS[pendingAction?.action ?? ''] ?? []).some(
            spec => !actionInputs[spec.key]?.trim()
          )
        )}
        onConfirm={handleActionConfirm}
        onCancel={handleActionCancel}
      >
        {actionStatus === 'executing' && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
            Applying...
          </div>
        )}
        {/* Dynamic input fields */}
        {pendingAction && (ACTION_INPUT_SPECS[pendingAction.action] ?? []).length > 0 && actionStatus !== 'executing' && (
          <div className="space-y-3">
            {(ACTION_INPUT_SPECS[pendingAction.action] ?? []).map(spec => (
              <div key={spec.key}>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  {spec.label}
                </label>
                {spec.type === 'textarea' ? (
                  <textarea
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    placeholder={spec.placeholder}
                    rows={3}
                    value={actionInputs[spec.key] ?? ''}
                    onChange={e => setActionInputs(prev => ({ ...prev, [spec.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    placeholder={spec.placeholder}
                    type="text"
                    value={actionInputs[spec.key] ?? ''}
                    onChange={e => setActionInputs(prev => ({ ...prev, [spec.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </ConfirmDialog>

      {/* Action result — uses Ship's ConfirmDialog for done/error feedback */}
      <ConfirmDialog
        open={actionStatus === 'done' || actionStatus === 'error'}
        title={actionStatus === 'done' ? 'Action Applied' : 'Action Failed'}
        description={
          actionStatus === 'done'
            ? 'The action was applied successfully. The analysis will refresh with updated data.'
            : actionError ?? 'Something went wrong. Please try again.'
        }
        confirmLabel="OK"
        cancelLabel="Dismiss"
        variant={actionStatus === 'done' ? 'success' : 'destructive'}
        onConfirm={() => { setActionStatus('idle'); setActionError(null) }}
        onCancel={() => { setActionStatus('idle'); setActionError(null) }}
      />
    </div>
  )
}
