/**
 * AnalysisSection - Chat-based analysis tab content for the FleetGraph FAB
 *
 * Provides conversational interface for document analysis
 */

import { useEffect, useRef, useState, type FormEvent } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useFleetGraphAnalysis,
  type ConversationEntry,
  type FleetGraphFinding,
} from '@/hooks/useFleetGraphAnalysis'

interface AnalysisSectionProps {
  documentId: string
  documentTitle: string
  documentType: string
}

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
    <div className="border border-gray-200 rounded-md p-2 space-y-1 bg-white">
      <div className="flex items-center gap-2">
        <FindingBadge severity={finding.severity} />
        <span className="text-xs font-medium text-gray-900">{finding.title}</span>
      </div>
      <p className="text-xs text-gray-600">{finding.summary}</p>
      {finding.proposedAction && finding.actionTier !== 'A' && (
        <div className="pt-1">
          {finding.actionTier === 'B' ? (
            <button
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              disabled={isApplyingThis}
              onClick={onApply}
              type="button"
            >
              {isApplyingThis ? 'Applying...' : (finding.proposedAction.label ?? 'Apply')}
            </button>
          ) : (
            <button
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              disabled={isApplyingThis}
              onClick={onConfirmRequest}
              type="button"
            >
              {isApplyingThis ? 'Applying...' : (finding.proposedAction.label ?? 'Apply')}
            </button>
          )}
        </div>
      )}
      {finding.actionTier === 'A' && finding.proposedAction && (
        <p className="text-xs text-indigo-600 font-medium pt-1">
          Suggested: {finding.proposedAction.label}
        </p>
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
        className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {entry.content}
      </div>
      {entry.findings && entry.findings.length > 0 && (
        <div className="mt-1.5 space-y-1.5 w-full">
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

export function AnalysisSection({
  documentId,
  documentTitle,
  documentType,
}: AnalysisSectionProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [confirmingFinding, setConfirmingFinding] = useState<FleetGraphFinding | null>(null)
  const hasAnalyzedRef = useRef(false)

  const {
    analyze,
    applyError,
    applyFindingAction,
    conversation,
    isAnalyzing,
    isApplying,
    isResponding,
    pendingActionFindingId,
    sendMessage,
  } = useFleetGraphAnalysis()

  // Auto-analyze on mount
  useEffect(() => {
    if (!hasAnalyzedRef.current && documentId) {
      hasAnalyzedRef.current = true
      analyze(documentId, documentType, documentTitle)
    }
  }, [documentId, documentType, documentTitle, analyze])

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

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Conversation area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isAnalyzing && conversation.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
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
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              Thinking...
            </div>
          )}
        </div>

        {/* Action error */}
        {applyError && (
          <p className="text-xs text-red-500 py-1">{applyError}</p>
        )}

        {/* Chat input */}
        <form className="pt-2 border-t border-gray-200 mt-2" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              className="flex-1 text-xs text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isAnalyzing || isResponding}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a follow-up..."
              type="text"
              value={input}
            />
            <button
              className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              disabled={!input.trim() || isAnalyzing || isResponding}
              type="submit"
            >
              Send
            </button>
          </div>
        </form>
      </div>

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
