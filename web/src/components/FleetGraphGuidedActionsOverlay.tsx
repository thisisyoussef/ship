import { useEffect, useMemo, useState } from 'react'

import { FleetGraphGuidedActionsPanel } from '@/components/FleetGraphGuidedActionsPanel'
import { useFleetGraphEntry } from '@/hooks/useFleetGraphEntry'
import {
  buildFleetGraphRequestedActions,
  type FleetGraphEntryInput,
  type FleetGraphRequestedActionDraft,
} from '@/lib/fleetgraph-entry'

interface FleetGraphGuidedActionsOverlayProps {
  activeTab?: string
  entry: FleetGraphEntryInput | null
  helperText: string
  isActionDisabled?: boolean
  nestedPath?: string
}

function buildContextKey(entry: FleetGraphEntryInput | null) {
  if (!entry) {
    return null
  }

  return [
    entry.document.id,
    entry.activeTab ?? 'current',
    entry.nestedPath ?? 'root',
  ].join('::')
}

interface FleetGraphGuidedActionCandidateCardProps {
  action: FleetGraphRequestedActionDraft
  activeTab?: string
  contextKey: string
  entry: FleetGraphEntryInput
  helperText: string
  nestedPath?: string
  syncDebugEntry?: boolean
}

function buildCandidateKey(
  contextKey: string,
  action: FleetGraphRequestedActionDraft
) {
  return [
    contextKey,
    action.type,
    action.targetType,
    action.targetId,
    action.endpoint.method,
    action.endpoint.path,
    JSON.stringify(action.body ?? null),
  ].join('::')
}

function FleetGraphGuidedActionCandidateCard({
  action,
  activeTab,
  contextKey,
  entry,
  helperText,
  nestedPath,
  syncDebugEntry = false,
}: FleetGraphGuidedActionCandidateCardProps) {
  const fleetGraph = useFleetGraphEntry()
  const candidateKey = useMemo(
    () => buildCandidateKey(contextKey, action),
    [action, contextKey]
  )

  useEffect(() => {
    fleetGraph.reset()
  }, [candidateKey])

  useEffect(() => {
    fleetGraph.previewApproval(entry, action)
  }, [candidateKey, entry, action])

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3">
      <div className="mb-3 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Candidate
        </p>
        <h3 className="text-sm font-semibold text-slate-950">{action.title}</h3>
        <p className="text-sm text-slate-600">{action.summary}</p>
      </div>
      <FleetGraphGuidedActionsPanel
        activeTab={activeTab}
        entry={entry}
        fleetGraph={fleetGraph}
        helperText={helperText}
        nestedPath={nestedPath}
        showIntro={false}
        showPreviewButton={false}
        syncDebugEntry={syncDebugEntry}
      />
    </div>
  )
}

export function FleetGraphGuidedActionsOverlay({
  activeTab,
  entry,
  helperText,
  isActionDisabled = false,
  nestedPath,
}: FleetGraphGuidedActionsOverlayProps) {
  const overlayOffsetStyle = useMemo(
    () => ({
      left: 'calc(var(--ship-main-left-offset, 3rem) + 1.5rem)',
    }),
    []
  )
  const overlayDialogStyle = useMemo(
    () => ({
      ...overlayOffsetStyle,
      width: 'min(calc(100vw - var(--ship-main-left-offset, 3rem) - 2.5rem), 24rem)',
    }),
    [overlayOffsetStyle]
  )
  const contextKey = useMemo(() => buildContextKey(entry), [entry])
  const [isOpen, setIsOpen] = useState(false)
  const [dismissedContextKey, setDismissedContextKey] = useState<string | null>(null)
  const previewCandidates = useMemo(
    () => entry
      ? buildFleetGraphRequestedActions(entry.document, entry.context, entry.activeTab)
      : [],
    [entry]
  )
  const [persistedCandidates, setPersistedCandidates] = useState<FleetGraphRequestedActionDraft[]>([])

  useEffect(() => {
    setIsOpen(false)
    setDismissedContextKey(null)
    setPersistedCandidates(isActionDisabled ? [] : previewCandidates)
  }, [contextKey, isActionDisabled, previewCandidates])

  useEffect(() => {
    if (!contextKey || isActionDisabled) {
      return
    }

    if (previewCandidates.length > 0) {
      setPersistedCandidates(previewCandidates)
      setIsOpen(true)
    }
  }, [contextKey, isActionDisabled, previewCandidates])

  const candidateCards = isActionDisabled
    ? []
    : persistedCandidates.length > 0
    ? persistedCandidates
    : previewCandidates
  const shouldSurface = candidateCards.length > 0
  const isDismissed = dismissedContextKey === contextKey

  useEffect(() => {
    if (!shouldSurface || !contextKey || isDismissed) {
      return
    }

    setIsOpen(true)
  }, [contextKey, isDismissed, shouldSurface])

  if (!contextKey || !shouldSurface) {
    return null
  }

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-6 left-6 z-50 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/95 px-4 py-2 text-sm font-medium text-slate-900 shadow-lg backdrop-blur transition-colors hover:bg-sky-50"
        onClick={() => setIsOpen(true)}
        style={overlayOffsetStyle}
        type="button"
      >
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        {candidateCards.length === 1
          ? 'Open guided step'
          : `Open ${candidateCards.length} guided steps`}
      </button>
    )
  }

  return (
    <div
      aria-label="FleetGraph guided actions"
      className="fixed bottom-6 z-50 rounded-[1.4rem] border border-sky-200/80 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur"
      role="dialog"
      style={overlayDialogStyle}
    >
      <div className="border-b border-sky-100 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800">
              Guided next steps
            </span>
            <h2 className="text-sm font-semibold text-slate-950">
              {candidateCards.length === 1
                ? 'FleetGraph found one guided next step'
                : `FleetGraph found ${candidateCards.length} guided next steps`}
            </h2>
            <p className="text-sm text-slate-600">
              FleetGraph checked this page automatically and surfaced the actions worth your attention.
            </p>
          </div>
          <button
            aria-label="Close guided actions"
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            onClick={() => {
              setDismissedContextKey(contextKey)
              setIsOpen(false)
            }}
            type="button"
          >
            Close
          </button>
        </div>
      </div>

      <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {entry
            ? candidateCards.map((action, index) => (
              <FleetGraphGuidedActionCandidateCard
                action={action}
                activeTab={activeTab}
                contextKey={contextKey}
                entry={entry}
                helperText={helperText}
                key={buildCandidateKey(contextKey, action)}
                nestedPath={nestedPath}
                syncDebugEntry={index === 0}
              />
            ))
            : null}
        </div>
      </div>
    </div>
  )
}
