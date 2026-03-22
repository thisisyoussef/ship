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
import { partitionFleetGraphReviewEvidence } from '@/lib/fleetgraph-review-presenter'

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
  return fields.reduce<Record<string, string | string[] | null>>(
    (values, field) => {
      if (field.type === 'hidden') {
        values[field.name] = field.value
        return values
      }

      values[field.name] = field.type === 'multi_select' ? [] : ''
      return values
    },
    {}
  )
}

function readFindingActionDraft(
  entry: ConversationEntry,
  finding: FleetGraphReasonedFinding
) {
  return entry.actionDrafts?.find(
    (draft) =>
      typeof draft.contextHints?.findingFingerprint === 'string'
      && draft.contextHints.findingFingerprint === finding.fingerprint
  )
}

function FindingBadge({
  severity,
}: {
  severity: FleetGraphReasonedFinding['severity']
}) {
  const colors = {
    critical: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  }

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${colors[severity]}`}
    >
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
        <span className="mb-1.5 block font-medium">{field.label}</span>
        <select
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          onChange={(event) => onChange(field.name, event.target.value)}
          value={typeof value === 'string' ? value : ''}
        >
          <option value="">{field.placeholder ?? 'Select an option'}</option>
          {field.options.map((option) => (
            <option
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
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
        <legend className="text-sm font-medium text-foreground">
          {field.label}
        </legend>
        {field.options.map((option) => (
          <label
            className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            key={option.value}
          >
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
        <span className="mb-1.5 block font-medium">{field.label}</span>
        <textarea
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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
      <span className="mb-1.5 block font-medium">{field.label}</span>
      <input
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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
    <div className="space-y-2 rounded-2xl border border-border bg-background p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <FindingBadge severity={finding.severity} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {finding.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {finding.explanation}
          </p>
        </div>
      </div>

      {finding.evidence.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-[11px] leading-5 text-muted">
          {finding.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      {actionDraft && (
        <div className="pt-1">
          <button
            className="rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isReviewingThis}
            onClick={() => onReviewAction(actionDraft)}
            type="button"
          >
            {isReviewingThis ? 'Preparing review...' : actionLabel(actionDraft)}
          </button>
        </div>
      )}
    </div>
  )
}

interface ConversationMessageProps {
  entry: ConversationEntry
  isReviewing: boolean
  onReviewAction: (actionDraft: FleetGraphActionDraft) => void
  pendingActionId: string | null
}

function ConversationMessage({
  entry,
  isReviewing,
  onReviewAction,
  pendingActionId,
}: ConversationMessageProps) {
  const isUser = entry.role === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6 ${
          isUser
            ? 'bg-accent text-white'
            : 'border border-border bg-background text-foreground shadow-sm'
        }`}
      >
        {entry.content}
      </div>

      {entry.findings && entry.findings.length > 0 && (
        <div className="mt-2 w-full space-y-2">
          {entry.findings.map((finding) => {
            const actionDraft = readFindingActionDraft(entry, finding)
            return (
              <FindingCard
                actionDraft={actionDraft}
                finding={finding}
                isReviewingThis={
                  Boolean(actionDraft)
                  && isReviewing
                  && pendingActionId === actionDraft?.actionId
                }
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
  const [reviewValues, setReviewValues] = useState<
    Record<string, string | string[] | null>
  >({})
  const hasAnalyzedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    analyze,
    applyError,
    applyReviewedAction,
    conversation,
    currentReview,
    dismissActionReview,
    isAnalyzing,
    isApplying,
    isContinuing,
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
  }, [conversation.length, currentReview])

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

  const reviewEvidence = useMemo(
    () =>
      partitionFleetGraphReviewEvidence(currentReview?.dialogSpec.evidence ?? []),
    [currentReview]
  )

  const isBusy = isApplying || isReviewing || isContinuing

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || isResponding || isContinuing) {
      return
    }
    sendMessage(message)
    setInput('')
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto" ref={scrollRef}>
          {isAnalyzing && conversation.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
              Analyzing {documentType}...
            </div>
          )}

          {conversation.map((entry, index) => (
            <ConversationMessage
              entry={entry}
              isReviewing={isBusy}
              key={`${entry.role}-${entry.timestamp}-${index}`}
              onReviewAction={requestActionReview}
              pendingActionId={pendingActionId}
            />
          ))}

          {(isResponding || isContinuing) && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
              {isContinuing ? 'Checking what should happen next...' : 'Thinking...'}
            </div>
          )}
        </div>

        {applyError && <p className="py-2 text-xs text-red-600">{applyError}</p>}

        <form className="mt-3 border-t border-border pt-3" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              disabled={isAnalyzing || isResponding || isContinuing}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a follow-up..."
              type="text"
              value={input}
            />
            <button
              className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!input.trim() || isAnalyzing || isResponding || isContinuing}
              type="submit"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {currentReview && (
        <ConfirmDialog
          cancelDisabled={isApplying}
          cancelLabel={currentReview.dialogSpec.cancelLabel}
          confirmDisabled={isApplying}
          confirmLabel={isApplying ? 'Applying...' : currentReview.dialogSpec.confirmLabel}
          description="You'll review the details first. Ship won't change until you confirm."
          onCancel={dismissActionReview}
          onConfirm={() => applyReviewedAction(reviewValues)}
          open={Boolean(currentReview)}
          title={currentReview.dialogSpec.title}
          variant="success"
        >
          <div className="space-y-4">
            {currentReview.validationError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {currentReview.validationError}
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                What you're approving
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-900">
                {currentReview.dialogSpec.summary}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Ship will only be updated after you press {currentReview.dialogSpec.confirmLabel}.
              </p>
            </section>

            {reviewFields.length > 0 && (
              <section className="space-y-3">
                {reviewFields.map((field) =>
                  renderDialogField(
                    field,
                    reviewValues[field.name] ?? null,
                    (name, value) => {
                      setReviewValues((prev) => ({
                        ...prev,
                        [name]: value,
                      }))
                    }
                  )
                )}
              </section>
            )}

            {reviewEvidence.facts.length > 0 && (
              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Check these details
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {reviewEvidence.facts.map((fact) => (
                    <div
                      className="rounded-2xl border border-border bg-background px-3 py-3 shadow-sm"
                      key={`${fact.label}:${fact.value}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                        {fact.label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {reviewEvidence.notes.length > 0 && (
              <section className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Why FleetGraph suggested this
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-foreground">
                  {reviewEvidence.notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </ConfirmDialog>
      )}
    </>
  )
}
