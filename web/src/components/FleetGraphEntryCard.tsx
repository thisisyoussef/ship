import { useMemo } from 'react'

import { useFleetGraphEntry } from '@/hooks/useFleetGraphEntry'
import type { DocumentContext } from '@/hooks/useDocumentContextQuery'
import type { FleetGraphEntryDocument } from '@/lib/fleetgraph-entry'

const buttonClassName = 'rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
const optionClassName = 'rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground'

interface FleetGraphEntryCardProps {
  activeTab?: string
  context?: DocumentContext
  contextError?: string
  document: FleetGraphEntryDocument
  loading?: boolean
  nestedPath?: string
  userId: string
}

function routeLabel(activeTab?: string, nestedPath?: string) {
  const parts = ['document-page']
  if (activeTab) {
    parts.push(activeTab)
  }
  if (nestedPath) {
    parts.push(nestedPath)
  }
  return parts.join(' / ')
}

export function FleetGraphEntryCard({
  activeTab,
  context,
  contextError,
  document,
  loading = false,
  nestedPath,
  userId,
}: FleetGraphEntryCardProps) {
  const entry = useMemo(() => {
    if (!context) {
      return null
    }

    return {
      activeTab,
      context,
      document,
      nestedPath,
      userId,
    }
  }, [activeTab, context, document, nestedPath, userId])
  const fleetGraph = useFleetGraphEntry()

  const disabled = loading || !entry || !document.workspaceId
  const helperText = contextError
    ?? (loading
      ? 'Loading the current Ship context for FleetGraph.'
      : document.workspaceId
        ? 'FleetGraph will send the current page context through the same-origin Ship API.'
        : 'This document is missing workspace metadata, so FleetGraph entry is disabled.')

  return (
    <section className="rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            FleetGraph entry
          </p>
          <h2 className="text-sm font-semibold text-foreground">
            Embedded same-origin context handoff
          </h2>
          <p className="text-sm text-muted">
            {helperText}
          </p>
          <p className="text-xs text-muted">
            Surface: {routeLabel(activeTab, nestedPath)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={buttonClassName}
            disabled={disabled || fleetGraph.isLoading}
            onClick={() => entry && fleetGraph.checkCurrentContext(entry)}
            type="button"
          >
            Check current context
          </button>
          <button
            className={buttonClassName}
            disabled={disabled || fleetGraph.isLoading}
            onClick={() => entry && fleetGraph.previewApproval(entry)}
            type="button"
          >
            Preview approval gate
          </button>
        </div>
      </div>

      {fleetGraph.isLoading ? (
        <p className="mt-3 text-sm text-muted">
          FleetGraph is validating the current page context.
        </p>
      ) : null}

      {fleetGraph.errorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {fleetGraph.errorMessage}
        </p>
      ) : null}

      {fleetGraph.result ? (
        <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/30 px-3 py-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {fleetGraph.result.summary.title}
            </p>
            <p className="text-sm text-muted">
              {fleetGraph.result.summary.detail}
            </p>
            <p className="text-xs text-muted">
              Thread: {fleetGraph.result.entry.threadId}
            </p>
          </div>

          {fleetGraph.result.approval ? (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-3">
              <p className="text-sm font-semibold text-amber-900">
                {fleetGraph.result.approval.title}
              </p>
              <p className="text-sm text-amber-900/80">
                {fleetGraph.result.approval.summary}
              </p>
              <p className="text-xs text-amber-900/70">
                Endpoint: {fleetGraph.result.approval.endpoint.method} {fleetGraph.result.approval.endpoint.path}
              </p>
              <div className="flex flex-wrap gap-2">
                {fleetGraph.result.approval.options.map((option) => (
                  <button
                    key={option.id}
                    className={optionClassName}
                    disabled
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Outcome: {fleetGraph.result.run.outcome} on {fleetGraph.result.summary.surfaceLabel}
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}
