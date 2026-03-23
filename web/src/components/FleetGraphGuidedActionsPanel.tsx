import { useEffect } from 'react'

import { useFleetGraphDebugSurface } from '@/components/FleetGraphDebugSurface'
import { useFleetGraphEntry } from '@/hooks/useFleetGraphEntry'
import { buildEntryDebugSnapshot } from '@/lib/fleetgraph-debug'
import type { FleetGraphEntryInput } from '@/lib/fleetgraph-entry'

const buttonClassName =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
const optionClassName =
  'rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
const sectionLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500'

interface FleetGraphGuidedActionsPanelProps {
  activeTab?: string
  entry: FleetGraphEntryInput | null
  helperText: string
  nestedPath?: string
}

export function FleetGraphGuidedActionsPanel({
  activeTab,
  entry,
  helperText,
  nestedPath,
}: FleetGraphGuidedActionsPanelProps) {
  const fleetGraph = useFleetGraphEntry()
  const approval = fleetGraph.result?.approval
  const actionResult = fleetGraph.actionResult
  const { setEntry } = useFleetGraphDebugSurface()
  const actionResultTone = actionResult?.actionOutcome.status === 'failed'
    ? {
        container: 'border-red-200 bg-red-50',
        detail: 'text-red-900/85',
        label: 'text-red-800',
        title: 'text-red-950',
      }
    : {
        container: 'border-emerald-200 bg-emerald-50',
        detail: 'text-emerald-900/85',
        label: 'text-emerald-800',
        title: 'text-emerald-950',
      }

  useEffect(() => {
    setEntry(
      fleetGraph.result
        ? buildEntryDebugSnapshot(fleetGraph.result, activeTab, nestedPath)
        : null
    )
  }, [activeTab, fleetGraph.result, nestedPath, setEntry])

  useEffect(() => {
    fleetGraph.reset()
  }, [entry?.activeTab, entry?.document.id, entry?.nestedPath])

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className={sectionLabelClassName}>Guided actions</p>
        <h3 className="text-sm font-semibold text-gray-900">Preview the next step</h3>
        <p className="text-sm text-gray-600">{helperText}</p>
      </div>

      <button
        className={buttonClassName}
        disabled={!entry || fleetGraph.isLoading}
        onClick={() => entry && fleetGraph.previewApproval(entry)}
        type="button"
      >
        Preview next step
      </button>

      {fleetGraph.isLoading ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          FleetGraph is reviewing the current page.
        </p>
      ) : null}

      {fleetGraph.errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {fleetGraph.errorMessage}
        </p>
      ) : null}

      {fleetGraph.result || actionResult ? (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
          {fleetGraph.result ? (
            <div className="space-y-1">
              <p className={sectionLabelClassName}>Current guidance</p>
              <p className="text-sm font-semibold text-gray-900">
                {fleetGraph.result.summary.title}
              </p>
              <p className="text-sm text-gray-600">{fleetGraph.result.summary.detail}</p>
            </div>
          ) : null}

          {actionResult ? (
            <div className={`space-y-1 rounded-xl border px-3 py-3 ${actionResultTone.container}`}>
              <p className={`${sectionLabelClassName} ${actionResultTone.label}`}>Latest result</p>
              <p className={`text-sm font-semibold ${actionResultTone.title}`}>
                {actionResult.summary.title}
              </p>
              <p className={`text-sm ${actionResultTone.detail}`}>
                {actionResult.summary.detail}
              </p>
            </div>
          ) : null}

          {approval ? (
            <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3">
              <p className={sectionLabelClassName}>Review step</p>
              <span className="inline-flex rounded-full border border-amber-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                Needs your confirmation
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-950">{approval.title}</p>
                <p className="text-sm text-amber-900/85">{approval.summary}</p>
                <p className="text-xs text-amber-900/75">
                  You stay in control. FleetGraph only acts after you confirm.
                </p>
              </div>
              <div className="space-y-2 rounded-lg border border-amber-200/80 bg-white/55 px-3 py-3">
                <p className={sectionLabelClassName}>Why FleetGraph surfaced this</p>
                <p className="text-sm text-amber-950">{approval.rationale}</p>
                {approval.evidence.length > 0 ? (
                  <ul className="space-y-1 text-sm text-amber-900/85">
                    {approval.evidence.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden="true" className="mt-[2px] text-amber-700">
                          -
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {approval.options.map((option) => (
                  <button
                    className={optionClassName}
                    disabled={fleetGraph.isApplying}
                    key={option.id}
                    onClick={() => {
                      if (option.id === 'apply' && fleetGraph.result) {
                        fleetGraph.applyApproval(
                          fleetGraph.result.entry.threadId,
                          approval,
                          fleetGraph.result.entry.current.id
                        )
                        return
                      }

                      if (option.id === 'dismiss') {
                        fleetGraph.dismissApproval()
                        return
                      }

                      if (option.id === 'snooze') {
                        fleetGraph.snoozeApproval()
                      }
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : fleetGraph.result ? (
            <p className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
              No guided step is needed for this page right now.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
