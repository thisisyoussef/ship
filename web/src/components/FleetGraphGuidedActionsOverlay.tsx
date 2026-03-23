import { useEffect, useMemo, useRef, useState } from 'react'

import { FleetGraphGuidedActionsPanel } from '@/components/FleetGraphGuidedActionsPanel'
import { useFleetGraphEntry } from '@/hooks/useFleetGraphEntry'
import type { FleetGraphEntryInput } from '@/lib/fleetgraph-entry'

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

function overlayTitle(
  approvalTitle?: string,
  actionTitle?: string
) {
  if (actionTitle) {
    return actionTitle
  }

  return approvalTitle ?? 'FleetGraph found a guided next step'
}

export function FleetGraphGuidedActionsOverlay({
  activeTab,
  entry,
  helperText,
  isActionDisabled = false,
  nestedPath,
}: FleetGraphGuidedActionsOverlayProps) {
  const fleetGraph = useFleetGraphEntry()
  const contextKey = useMemo(() => buildContextKey(entry), [entry])
  const lastAutoPreviewContextRef = useRef<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [dismissedContextKey, setDismissedContextKey] = useState<string | null>(null)

  useEffect(() => {
    fleetGraph.reset()
    setIsOpen(false)
    setDismissedContextKey(null)
  }, [contextKey])

  useEffect(() => {
    if (!entry || !contextKey || isActionDisabled) {
      return
    }

    if (lastAutoPreviewContextRef.current === contextKey) {
      return
    }

    lastAutoPreviewContextRef.current = contextKey
    fleetGraph.previewApproval(entry)
  }, [contextKey, entry, fleetGraph, isActionDisabled])

  const hasApproval = Boolean(fleetGraph.result?.approval)
  const hasActionResult = Boolean(fleetGraph.actionResult)
  const hasError = Boolean(fleetGraph.errorMessage)
  const shouldSurface = hasApproval || hasActionResult || hasError
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
        type="button"
      >
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        Open guided step
      </button>
    )
  }

  return (
    <div
      aria-label="FleetGraph guided actions"
      className="fixed bottom-6 left-6 z-50 w-[min(calc(100vw-2rem),24rem)] rounded-[1.4rem] border border-sky-200/80 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur"
      role="dialog"
    >
      <div className="border-b border-sky-100 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800">
              Guided next step
            </span>
            <h2 className="text-sm font-semibold text-slate-950">
              {overlayTitle(
                fleetGraph.result?.approval?.title,
                fleetGraph.actionResult?.summary.title
              )}
            </h2>
            <p className="text-sm text-slate-600">
              FleetGraph checked this page automatically and surfaced the next action worth your attention.
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
        <FleetGraphGuidedActionsPanel
          activeTab={activeTab}
          entry={entry}
          fleetGraph={fleetGraph}
          helperText={helperText}
          nestedPath={nestedPath}
          showPreviewButton={false}
        />
      </div>
    </div>
  )
}
