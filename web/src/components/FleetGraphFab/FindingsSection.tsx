/**
 * FindingsSection - Proactive findings tab content for the FleetGraph FAB
 *
 * Displays proactive findings with actions: Review/Apply, Dismiss, Snooze
 */

import { useEffect, useRef, useState } from 'react'

import type { DocumentContext } from '@/hooks/useDocumentContextQuery'
import { useFleetGraphFindings } from '@/hooks/useFleetGraphFindings'
import { buildFleetGraphFindingDocumentIds } from '@/lib/fleetgraph-findings'
import type { FleetGraphFinding, FleetGraphFindingReview } from '@/lib/fleetgraph-findings'
import { partitionFleetGraphReviewEvidence } from '@/lib/fleetgraph-review-presenter'
import {
  buildApplyNotice,
  buildDismissNotice,
  buildFindingSummary,
  buildSnoozeNotice,
  formatFleetGraphTimestamp,
  renderExecutionLabel,
  renderExecutionTone,
  renderFindingStatus,
} from '@/lib/fleetgraph-findings-presenter'

interface FindingsSectionProps {
  context?: DocumentContext
  currentDocumentId: string
  loading?: boolean
  onOpenAnalyze: () => void
}

interface LocalNotice {
  message: string
  tone: 'error' | 'info' | 'success'
}

interface ApplyReceipt {
  findingKey: string
  message: string
  tone: 'info' | 'success'
}

interface ReviewState {
  findingId: string | null
  openedAt: number | null
  review: FleetGraphFindingReview | null
}

const REVIEW_GESTURE_GUARD_MS = 450

function noticeToneClassName(tone: LocalNotice['tone']) {
  if (tone === 'info') {
    return 'border-sky-200 bg-sky-50 text-sky-900'
  }

  if (tone === 'error') {
    return 'border-red-200 bg-red-50 text-red-800'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-800'
}

function FindingCard({
  finding,
  confirming,
  isMutating,
  review,
  onApply,
  onDismiss,
  onReview,
  onSnooze,
  onCancelReview,
}: {
  finding: FleetGraphFinding
  confirming: boolean
  isMutating: boolean
  review?: FleetGraphFindingReview | null
  onApply: (findingId: string) => void
  onDismiss: (findingId: string) => void
  onReview: (findingId: string) => void
  onSnooze: (findingId: string, preset: '10s' | '4h') => void
  onCancelReview: () => void
}) {
  const executionLabel = finding.actionExecution ? renderExecutionLabel(finding) : null
  const executionTone = finding.actionExecution ? renderExecutionTone(finding) : null
  const findingEvidence = partitionFleetGraphReviewEvidence(finding.evidence)
  const reviewEvidence = partitionFleetGraphReviewEvidence(review?.evidence ?? [])
  const reviewButtonLabel = finding.findingType === 'week_start_drift'
    ? 'Review week start'
    : 'Review action'

  // Map finding types to visual styles
  const findingTypeStyles: Record<string, { border: string; badge: string }> = {
    week_start_drift: {
      border: 'border-amber-200 bg-amber-50',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    },
  }
  const style = findingTypeStyles[finding.findingType] ?? {
    border: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${style.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${style.badge}`}>
              {finding.findingType.replace(/_/g, ' ')}
            </span>
            <span className="text-sm font-medium text-gray-900">{finding.title}</span>
          </div>
          <p className="text-xs text-gray-600">{buildFindingSummary(finding)}</p>
          <p className="text-xs text-gray-500">{renderFindingStatus(finding)}</p>
        </div>
      </div>

      {/* Evidence */}
      {finding.evidence.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">Why this matters:</p>
          {findingEvidence.facts.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {findingEvidence.facts.map((fact) => (
                <div
                  className="rounded-lg border border-gray-200 bg-white/80 px-3 py-2"
                  key={`${fact.label}:${fact.value}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {fact.label}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-900">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          )}
          {findingEvidence.notes.length > 0 && (
            <ul className="space-y-1">
              {findingEvidence.notes.slice(0, 2).map((item, idx) => (
                <li key={`${item}-${idx}`} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gray-400" />
                  {item}
                </li>
              ))}
              {findingEvidence.notes.length > 2 && (
                <li className="text-xs text-gray-500">+{findingEvidence.notes.length - 2} more</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Recommended action */}
      {finding.recommendedAction && (
        <div className="border-t border-gray-200 pt-2 space-y-2">
          {executionLabel && (
            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${executionTone}`}>
              {executionLabel}
            </span>
          )}
          <div className="text-xs">
            <p className="font-medium text-gray-900">{finding.recommendedAction.title}</p>
            <p className="text-gray-600">{finding.recommendedAction.summary}</p>
          </div>

          {finding.actionExecution ? (
            <div className="text-xs text-gray-500">
              <p>{finding.actionExecution.message}</p>
              <p>
                Attempt {finding.actionExecution.attemptCount}
                {' '}• Updated {formatFleetGraphTimestamp(finding.actionExecution.updatedAt)}
              </p>
            </div>
          ) : confirming ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-white/90 p-3">
              <div className="text-xs">
                <p className="font-semibold text-gray-900">
                  {review?.title ?? 'Start this week in Ship?'}
                </p>
                <p className="mt-1 text-gray-600">
                  {review?.summary ?? 'This week has passed its planned start, but Ship still lists it as Planning.'}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-gray-500">
                  Ship will not change until you confirm.
                </p>
              </div>
              {reviewEvidence.facts.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {reviewEvidence.facts.map((fact) => (
                    <div
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      key={`${fact.label}:${fact.value}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                        {fact.label}
                      </p>
                      <p className="mt-1 text-xs font-medium text-gray-900">
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {reviewEvidence.notes.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1">
                  {reviewEvidence.notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-2">
                <button
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:opacity-50"
                  disabled={isMutating}
                  onClick={onCancelReview}
                  type="button"
                >
                  {review?.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isMutating}
                  onClick={() => onApply(finding.id)}
                  type="button"
                >
                  {review?.confirmLabel ?? 'Apply'}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={isMutating}
              onClick={() => onReview(finding.id)}
              type="button"
            >
              {reviewButtonLabel}
            </button>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
        <span className="text-xs text-gray-500">Quick:</span>
        <button
          className="text-xs px-2 py-0.5 rounded border border-gray-400 bg-white text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-500 disabled:opacity-50"
          disabled={isMutating}
          onClick={() => onDismiss(finding.id)}
          type="button"
        >
          Dismiss
        </button>
        <button
          className="text-xs px-2 py-0.5 rounded border border-gray-400 bg-white text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-500 disabled:opacity-50"
          disabled={isMutating}
          onClick={() => onSnooze(finding.id, '10s')}
          type="button"
        >
          Snooze 10s
        </button>
        <button
          className="text-xs px-2 py-0.5 rounded border border-gray-400 bg-white text-gray-700 font-medium hover:bg-gray-100 hover:border-gray-500 disabled:opacity-50"
          disabled={isMutating}
          onClick={() => onSnooze(finding.id, '4h')}
          type="button"
        >
          Snooze 4h
        </button>
      </div>
    </div>
  )
}

export function FindingsSection({
  context,
  currentDocumentId,
  loading = false,
  onOpenAnalyze,
}: FindingsSectionProps) {
  const documentIds = buildFleetGraphFindingDocumentIds(currentDocumentId, context)
  const findings = useFleetGraphFindings(documentIds)
  const [reviewState, setReviewState] = useState<ReviewState>({
    findingId: null,
    openedAt: null,
    review: null,
  })
  const [applyReceipt, setApplyReceipt] = useState<ApplyReceipt | null>(null)
  const [hiddenFindingKeys, setHiddenFindingKeys] = useState<string[]>([])
  const [localNotice, setLocalNotice] = useState<LocalNotice | null>(null)
  const snoozeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibleFindings = findings.findings.filter(
    (finding) => !hiddenFindingKeys.includes(finding.findingKey)
  )

  // Debug: log finding counts to console so we can verify the frontend receives all findings
  useEffect(() => {
    if (findings.findings.length > 0) {
      console.log(`[FleetGraph] Received ${findings.findings.length} findings, ${visibleFindings.length} visible:`,
        findings.findings.map(f => `${f.findingType}:${f.id.substring(0,8)}`))
    }
  }, [findings.findings.length, visibleFindings.length])

  useEffect(() => () => {
    if (snoozeRefreshTimeoutRef.current !== null) {
      clearTimeout(snoozeRefreshTimeoutRef.current)
    }
  }, [])

  function scheduleSnoozeRefresh(snoozedUntil?: string) {
    if (snoozeRefreshTimeoutRef.current !== null) {
      clearTimeout(snoozeRefreshTimeoutRef.current)
      snoozeRefreshTimeoutRef.current = null
    }

    if (!snoozedUntil) return

    const delayMs = new Date(snoozedUntil).getTime() - Date.now()
    if (!Number.isFinite(delayMs)) return

    snoozeRefreshTimeoutRef.current = setTimeout(() => {
      void findings.refetchFindings()
      snoozeRefreshTimeoutRef.current = null
    }, Math.max(delayMs, 0) + 250)
  }

  async function handleDismiss(findingId: string) {
    setApplyReceipt(null)
    setLocalNotice(null)
    findings.resetActionState()

    try {
      await findings.dismissFinding(findingId)
      setReviewState((current) =>
        current.findingId === findingId
          ? { findingId: null, openedAt: null, review: null }
          : current
      )
      setLocalNotice({
        message: buildDismissNotice(),
        tone: 'info',
      })
    } catch (err) {
      console.error('FleetGraph dismiss failed:', err)
      setLocalNotice({ message: err instanceof Error ? err.message : 'Failed to dismiss finding. Please try again.', tone: 'error' })
    }
  }

  async function handleSnooze(findingId: string, preset: '10s' | '4h') {
    setApplyReceipt(null)
    setLocalNotice(null)
    findings.resetActionState()

    try {
      const snoozeInput = preset === '10s' ? { seconds: 10 } : { minutes: 240 }
      const response = await findings.snoozeFinding(findingId, snoozeInput)
      setReviewState((current) =>
        current.findingId === findingId
          ? { findingId: null, openedAt: null, review: null }
          : current
      )
      setLocalNotice({
        message: buildSnoozeNotice(
          response.finding.snoozedUntil,
          preset === '10s' ? '10 seconds' : '4 hours'
        ),
        tone: 'info',
      })
      scheduleSnoozeRefresh(response.finding.snoozedUntil)
    } catch (err) {
      console.error('FleetGraph snooze failed:', err)
      setLocalNotice({ message: err instanceof Error ? err.message : 'Failed to snooze finding. Please try again.', tone: 'error' })
    }
  }

  async function handleApply(findingId: string) {
    if (
      reviewState.findingId === findingId &&
      reviewState.openedAt !== null &&
      Date.now() - reviewState.openedAt < REVIEW_GESTURE_GUARD_MS
    ) {
      return
    }

    setLocalNotice(null)
    setApplyReceipt(null)
    findings.resetActionState()

    try {
      const response = await findings.applyFinding(findingId)
      setReviewState({ findingId: null, openedAt: null, review: null })

      const notice = buildApplyNotice(response.finding)
      if (!notice) {
        return
      }

      if (notice.tone === 'error') {
        setLocalNotice({
          message: notice.message,
          tone: 'error',
        })
        return
      }

      setHiddenFindingKeys((current) => current.includes(response.finding.findingKey)
        ? current
        : [...current, response.finding.findingKey])
      setApplyReceipt({
        findingKey: response.finding.findingKey,
        message: notice.message,
        tone: notice.tone,
      })

      const refetchResult = await findings.refetchFindings()
      const stillActive = refetchResult.data?.findings.some((finding) =>
        finding.findingKey === response.finding.findingKey
      )

      if (stillActive) {
        setApplyReceipt(null)
        setHiddenFindingKeys((current) =>
          current.filter((findingKey) => findingKey !== response.finding.findingKey)
        )
        setLocalNotice({
          message: 'FleetGraph could not confirm that Ship changed. This finding is still active.',
          tone: 'error',
        })
      }
    } catch (error) {
      console.error('FleetGraph apply failed:', error)
    }
  }

  async function handleReview(findingId: string) {
    setApplyReceipt(null)
    setLocalNotice(null)
    findings.resetActionState()

    try {
      const response = await findings.reviewFinding(findingId)
      setReviewState({
        findingId,
        openedAt: Date.now(),
        review: response.review,
      })
    } catch (error) {
      console.error('FleetGraph review failed:', error)
    }
  }

  return (
    <div className="space-y-3">
      {/* Error states */}
      {findings.loadErrorMessage && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {findings.loadErrorMessage}
        </p>
      )}

      {findings.actionErrorMessage && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {findings.actionErrorMessage}
        </p>
      )}

      {localNotice && (
        <p className={`text-xs rounded px-2 py-1.5 border ${noticeToneClassName(localNotice.tone)}`}>
          {localNotice.message}
        </p>
      )}

      {applyReceipt && (
        <div className={`rounded-lg border px-3 py-3 ${noticeToneClassName(applyReceipt.tone)}`}>
          <p className="text-sm font-medium">{applyReceipt.message}</p>
          <p className="mt-1 text-xs opacity-80">
            FleetGraph retired this finding and can keep going from here.
          </p>
          <button
            className="mt-3 rounded border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold hover:bg-white"
            onClick={() => {
              setApplyReceipt(null)
              setLocalNotice(null)
              onOpenAnalyze()
            }}
            type="button"
          >
            Analyze what's next
          </button>
        </div>
      )}

      {/* Loading state */}
      {(findings.isLoading || loading) && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          Checking for proactive findings...
        </div>
      )}

      {/* Empty state */}
      {!findings.isLoading && !loading && visibleFindings.length === 0 && (
        <div className="text-center py-6">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No active findings</p>
          <p className="text-xs text-gray-400">FleetGraph is monitoring this page</p>
        </div>
      )}

      {/* Findings list */}
      {visibleFindings.length > 0 && (
        <div className="space-y-2">
          {visibleFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              confirming={reviewState.findingId === finding.id}
              isMutating={findings.isMutating}
              review={reviewState.findingId === finding.id ? reviewState.review : null}
              onApply={(id) => void handleApply(id)}
              onDismiss={(id) => void handleDismiss(id)}
              onReview={(id) => void handleReview(id)}
              onSnooze={(id, preset) => void handleSnooze(id, preset)}
              onCancelReview={() => setReviewState({ findingId: null, openedAt: null, review: null })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
