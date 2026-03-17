import { useEffect, useRef, useState, type FormEvent } from 'react'

import { ConfirmDialog } from './ConfirmDialog'
import {
  useFleetGraphAnalysis,
  type ConversationEntry,
  type FleetGraphFinding,
} from '@/hooks/useFleetGraphAnalysis'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface FleetGraphFabProps {
  documentId: string
  documentTitle: string
  documentType: string
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function FindingBadge({ severity }: { severity: FleetGraphFinding['severity'] }) {
  const colors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${colors[severity]}`}>
      {severity}
    </span>
  )
}

interface FindingCardProps {
  finding: FleetGraphFinding
  isApplyingThis: boolean
  onApply: () => void
  onConfirmRequest: () => void
}

function FindingCard({ finding, isApplyingThis, onApply, onConfirmRequest }: FindingCardProps) {
  return (
    <div className="border border-gray-200 rounded-md p-3 space-y-1">
      <div className="flex items-center gap-2">
        <FindingBadge severity={finding.severity} />
        <span className="text-sm font-medium text-gray-900">{finding.title}</span>
      </div>
      <p className="text-sm text-gray-600">{finding.summary}</p>
      {finding.proposedAction && finding.actionTier !== 'A' && (
        <div className="pt-2">
          {finding.actionTier === 'B' ? (
            <button
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isApplyingThis}
              onClick={onApply}
              type="button"
            >
              {isApplyingThis ? 'Applying…' : (finding.proposedAction.label ?? 'Apply')}
            </button>
          ) : (
            <button
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isApplyingThis}
              onClick={onConfirmRequest}
              type="button"
            >
              {isApplyingThis ? 'Applying…' : (finding.proposedAction.label ?? 'Apply')}
            </button>
          )}
        </div>
      )}
      {finding.actionTier === 'A' && finding.proposedAction && (
        <div className="pt-1">
          <span className="text-xs text-indigo-600 font-medium">
            Suggested: {finding.proposedAction.label}
          </span>
        </div>
      )}
    </div>
  )
}

interface ConversationMessageProps {
  entry: ConversationEntry
  isApplying: boolean
  pendingActionFindingId: string | null
  onApplyFinding: (finding: FleetGraphFinding) => void
  onConfirmFinding: (finding: FleetGraphFinding) => void
}

function ConversationMessage({
  entry,
  isApplying,
  pendingActionFindingId,
  onApplyFinding,
  onConfirmFinding,
}: ConversationMessageProps) {
  const isUser = entry.role === 'user'
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {entry.content}
      </div>
      {entry.findings && entry.findings.length > 0 && (
        <div className="mt-2 space-y-2 w-full">
          {entry.findings.map((finding, idx) => {
            const key = `${finding.findingType}:${finding.title}`
            return (
              <FindingCard
                key={idx}
                finding={finding}
                isApplyingThis={isApplying && pendingActionFindingId === key}
                onApply={() => onApplyFinding(finding)}
                onConfirmRequest={() => onConfirmFinding(finding)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function FleetGraphFab({
  documentId,
  documentTitle,
  documentType,
}: FleetGraphFabProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [confirmingFinding, setConfirmingFinding] = useState<FleetGraphFinding | null>(null)

  const {
    analyze,
    applyFindingAction,
    conversation,
    isAnalyzing,
    isApplying,
    isResponding,
    pendingActionFindingId,
    sendMessage,
  } = useFleetGraphAnalysis()

  // Auto-analyze when opening on a new document
  const lastAnalyzedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isOpen && documentId && lastAnalyzedRef.current !== documentId) {
      lastAnalyzedRef.current = documentId
      analyze(documentId, documentType, documentTitle)
    }
  }, [isOpen, documentId, documentType, documentTitle, analyze])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      behavior: 'smooth',
      top: scrollRef.current.scrollHeight,
    })
  }, [conversation.length])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const message = input.trim()
    if (!message || isResponding) return
    sendMessage(message)
    setInput('')
  }

  const findingCount = conversation
    .flatMap((e) => e.findings ?? [])
    .filter((f) => f.severity !== 'info').length

  return (
    <>
      {/* FAB Button */}
      <button
        aria-label="FleetGraph Intelligence"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {isOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        )}
        {/* Badge */}
        {!isOpen && findingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {findingCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 max-h-[70vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <span className="text-sm font-semibold text-gray-900">FleetGraph</span>
              <span className="text-xs text-gray-500 ml-auto">
                {documentType}: {documentTitle}
              </span>
            </div>
          </div>

          {/* Content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {isAnalyzing && conversation.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                Analyzing {documentType}...
              </div>
            )}

            {conversation.map((entry, idx) => (
              <ConversationMessage
                key={idx}
                entry={entry}
                isApplying={isApplying}
                pendingActionFindingId={pendingActionFindingId}
                onApplyFinding={(finding) => { void applyFindingAction(finding) }}
                onConfirmFinding={(finding) => setConfirmingFinding(finding)}
              />
            ))}

            {isResponding && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {/* Chat input */}
          <form className="px-4 py-3 border-t border-gray-200" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isAnalyzing || isResponding}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up..."
                type="text"
                value={input}
              />
              <button
                className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!input.trim() || isAnalyzing || isResponding}
                type="submit"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tier C confirm dialog */}
      {confirmingFinding && (
        <ConfirmDialog
          open={confirmingFinding !== null}
          title={confirmingFinding.proposedAction?.label ?? confirmingFinding.title}
          description={confirmingFinding.summary}
          confirmLabel={confirmingFinding.proposedAction?.label ?? 'Apply'}
          cancelLabel="Cancel"
          onConfirm={() => {
            const finding = confirmingFinding
            setConfirmingFinding(null)
            void applyFindingAction(finding)
          }}
          onCancel={() => setConfirmingFinding(null)}
        >
          {confirmingFinding.evidence.length > 0 && (
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {confirmingFinding.evidence.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </ConfirmDialog>
      )}
    </>
  )
}
