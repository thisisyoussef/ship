import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useFleetGraphAnalysis,
  type ConversationEntry,
} from '@/hooks/useFleetGraphAnalysis'
import type {
  FleetGraphActionDraft,
  FleetGraphDialogField,
  FleetGraphReasonedFinding,
} from '@/lib/fleetgraph-entry'

interface AnalysisSectionProps {
  documentId: string
  documentTitle: string
  documentType: string
}

function actionLabel(actionDraft: FleetGraphActionDraft) {
  switch (actionDraft.actionType) {
    case 'start_week':
      return 'Review week start'
    case 'approve_project_plan':
      return 'Review project approval'
    case 'approve_week_plan':
      return 'Review week approval'
    case 'assign_owner':
      return 'Assign owner'
    case 'assign_issues':
      return 'Assign issues'
    case 'post_comment':
      return 'Post comment'
    case 'post_standup':
      return 'Post standup'
    case 'escalate_risk':
      return 'Respond to risk'
    case 'rebalance_load':
      return 'Rebalance workload'
    default:
      return 'Review action'
  }
}

function buildInitialDialogValues(fields: FleetGraphDialogField[]) {
  return fields.reduce<Record<string, string | string[] | null>>((values, field) => {
    if (field.type === 'hidden') {
      values[field.name] = field.value
      return values
    }

    values[field.name] = field.type === 'multi_select' ? [] : ''
    return values
  }, {})
}

function readFindingActionDraft(
  entry: ConversationEntry,
  finding: FleetGraphReasonedFinding
) {
  return entry.actionDrafts?.find((draft) =>
    typeof draft.contextHints?.findingFingerprint === 'string'
    && draft.contextHints.findingFingerprint === finding.fingerprint
  )
}

function FindingBadge({ severity }: { severity: FleetGraphReasonedFinding['severity'] }) {
  const colors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
  }

  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs ${colors[severity]}`}>
      {severity}
    </span>
  )
}

function renderDialogField(
  field: FleetGraphDialogField,
  value: string | string[] | null,
  onChange: (name: string, nextValue: string | string[] | null) => void
) {
  if (field.type === 'hidden') {
    return null
  }

  if (field.type === 'single_select') {
    return (
      <label className="block text-sm text-foreground" key={field.name}>
        <span className="mb-1 block font-medium">{field.label}</span>
        <select
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          onChange={(event) => onChange(field.name, event.target.value)}
          value={typeof value === 'string' ? value : ''}
        >
          <option value="">{field.placeholder ?? 'Select an option'}</option>
          {field.options.map((option) => (
            <option disabled={option.disabled} key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field.type === 'multi_select') {
    const selectedValues = Array.isArray(value) ? value : []
    return (
      <fieldset className="space-y-2" key={field.name}>
        <legend className="text-sm font-medium text-foreground">{field.label}</legend>
        {field.options.map((option) => (
          <label className="flex items-center gap-2 text-sm text-foreground" key={option.value}>
            <input
              checked={selectedValues.includes(option.value)}
              disabled={option.disabled}
              onChange={(event) => {
                const nextValues = event.target.checked
                  ? [...selectedValues, option.value]
                  : selectedValues.filter((entry) => entry !== option.value)
                onChange(field.name, nextValues)
              }}
              type="checkbox"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label className="block text-sm text-foreground" key={field.name}>
        <span className="mb-1 block font-medium">{field.label}</span>
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 4}
          value={typeof value === 'string' ? value : ''}
        />
      </label>
    )
  }

  return (
    <label className="block text-sm text-foreground" key={field.name}>
      <span className="mb-1 block font-medium">{field.label}</span>
      <input
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        type="text"
        value={typeof value === 'string' ? value : ''}
      />
    </label>
  )
}

interface FindingCardProps {
  actionDraft?: FleetGraphActionDraft
  finding: FleetGraphReasonedFinding
  isReviewingThis: boolean
  onReviewAction: (actionDraft: FleetGraphActionDraft) => void
}

function FindingCard({
  actionDraft,
  finding,
  isReviewingThis,
  onReviewAction,
}: FindingCardProps) {
  return (
    <div className="space-y-1 rounded-md border border-gray-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <FindingBadge severity={finding.severity} />
        <span className="text-xs font-medium text-gray-900">{finding.title}</span>
      </div>
      <p className="text-xs text-gray-600">{finding.explanation}</p>
      {finding.evidence.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-[11px] text-gray-500">
          {finding.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {actionDraft && (
        <div className="pt-1">
          <button
            className="rounded bg-indigo-600 px-2 py-1 text-xs text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            disabled={isReviewingThis}
            onClick={() => onReviewAction(actionDraft)}
            type="button"
          >
            {isReviewingThis ? 'Reviewing...' : actionLabel(actionDraft)}
          </button>
        </div>
      )}
    </div>
  )
}

interface ConversationMessageProps {
  entry: ConversationEntry
  isReviewing: boolean
  pendingActionId: string | null
  onReviewAction: (actionDraft: FleetGraphActionDraft) => void
}

function ConversationMessage({
  entry,
  isReviewing,
  pendingActionId,
  onReviewAction,
}: ConversationMessageProps) {
  const isUser = entry.role === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {entry.content}
      </div>
      {entry.findings && entry.findings.length > 0 && (
        <div className="mt-1.5 w-full space-y-1.5">
          {entry.findings.map((finding) => {
            const actionDraft = readFindingActionDraft(entry, finding)
            return (
              <FindingCard
                actionDraft={actionDraft}
                finding={finding}
                isReviewingThis={Boolean(actionDraft) && isReviewing && pendingActionId === actionDraft?.actionId}
                key={finding.fingerprint}
                onReviewAction={onReviewAction}
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
  const [reviewValues, setReviewValues] = useState<Record<string, string | string[] | null>>({})
  const hasAnalyzedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    actionNotice,
    analyze,
    applyError,
    applyReviewedAction,
    conversation,
    currentReview,
    dismissActionReview,
    isAnalyzing,
    isApplying,
    isResponding,
    isReviewing,
    pendingActionId,
    requestActionReview,
    sendMessage,
  } = useFleetGraphAnalysis()

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
  }, [conversation.length])

  useEffect(() => {
    if (!currentReview) {
      setReviewValues({})
      return
    }

    setReviewValues(buildInitialDialogValues(currentReview.dialogSpec.fields))
  }, [currentReview])

  const reviewFields = useMemo(
    () => currentReview?.dialogSpec.fields ?? [],
    [currentReview]
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || isResponding) {
      return
    }
    sendMessage(message)
    setInput('')
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto min-h-0" ref={scrollRef}>
          {isAnalyzing && conversation.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
              Analyzing {documentType}...
            </div>
          )}

          {conversation.map((entry, index) => (
            <ConversationMessage
              entry={entry}
              isReviewing={isApplying || isReviewing}
              key={index}
              onReviewAction={requestActionReview}
              pendingActionId={pendingActionId}
            />
          ))}

          {isResponding && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
              Thinking...
            </div>
          )}
        </div>

        {applyError && (
          <p className="py-1 text-xs text-red-500">{applyError}</p>
        )}

        {actionNotice && (
          <p className="py-1 text-xs text-emerald-700">{actionNotice}</p>
        )}

        <form className="mt-2 border-t border-gray-200 pt-2" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isAnalyzing || isResponding}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a follow-up..."
              type="text"
              value={input}
            />
            <button
              className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              disabled={!input.trim() || isAnalyzing || isResponding}
              type="submit"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {currentReview && (
        <ConfirmDialog
          cancelLabel={currentReview.dialogSpec.cancelLabel}
          confirmLabel={currentReview.dialogSpec.confirmLabel}
          description={currentReview.dialogSpec.summary}
          onCancel={dismissActionReview}
          onConfirm={() => applyReviewedAction(reviewValues)}
          open={Boolean(currentReview)}
          title={currentReview.dialogSpec.title}
        >
          <div className="space-y-3">
            {currentReview.validationError && (
              <p className="text-sm text-red-600">{currentReview.validationError}</p>
            )}
            {reviewFields.map((field) =>
              renderDialogField(
                field,
                reviewValues[field.name] ?? null,
                (name, value) => {
                  setReviewValues((prev) => ({
                    ...prev,
                    [name]: value,
                  }))
                },
              )
            )}
            {currentReview.dialogSpec.evidence.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-sm text-gray-700">
                {currentReview.dialogSpec.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </ConfirmDialog>
      )}
    </>
  )
}
