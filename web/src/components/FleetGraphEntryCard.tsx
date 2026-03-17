import { useMemo } from 'react';

import { FleetGraphDebugDisclosure } from '@/components/FleetGraphDebugDisclosure';
import type { DocumentContext } from '@/hooks/useDocumentContextQuery';
import { useFleetGraphEntry } from '@/hooks/useFleetGraphEntry';
import type { FleetGraphEntryDocument } from '@/lib/fleetgraph-entry';

const buttonClassName =
  'rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';
const optionClassName =
  'rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground';

interface FleetGraphEntryCardProps {
  activeTab?: string;
  context?: DocumentContext;
  contextError?: string;
  document: FleetGraphEntryDocument;
  loading?: boolean;
  nestedPath?: string;
  userId: string;
}

function routeLabel(activeTab?: string, nestedPath?: string) {
  const parts = ['document-page'];
  if (activeTab) {
    parts.push(activeTab);
  }
  if (nestedPath) {
    parts.push(nestedPath);
  }
  return parts.join(' / ');
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
      return null;
    }

    return {
      activeTab,
      context,
      document,
      nestedPath,
      userId,
    };
  }, [activeTab, context, document, nestedPath, userId]);
  const fleetGraph = useFleetGraphEntry();

  const disabled = loading || !entry || !document.workspaceId;
  const helperText =
    contextError
    ?? (loading
      ? 'Loading the current Ship context for FleetGraph.'
      : document.workspaceId
        ? 'FleetGraph can review the page you are on and suggest the next step.'
        : 'This page is missing workspace details, so FleetGraph is unavailable here.');

  return (
    <section className="rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            FleetGraph entry
          </p>
          <h2 className="text-sm font-semibold text-foreground">Help for this page</h2>
          <p className="text-sm text-muted">{helperText}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={buttonClassName}
            disabled={disabled || fleetGraph.isLoading}
            onClick={() => entry && fleetGraph.checkCurrentContext(entry)}
            type="button"
          >
            Check this page
          </button>
          <button
            className={buttonClassName}
            disabled={disabled || fleetGraph.isLoading}
            onClick={() => entry && fleetGraph.previewApproval(entry)}
            type="button"
          >
            Preview approval step
          </button>
        </div>
      </div>

      {fleetGraph.isLoading ? (
        <p className="mt-3 text-sm text-muted">FleetGraph is reviewing the current page.</p>
      ) : null}

      {fleetGraph.errorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {fleetGraph.errorMessage}
        </p>
      ) : null}

      {fleetGraph.result ? (
        <div className="mt-3 space-y-3 rounded-md border border-border bg-muted/30 px-3 py-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{fleetGraph.result.summary.title}</p>
            <p className="text-sm text-muted">{fleetGraph.result.summary.detail}</p>
          </div>

          {fleetGraph.result.approval ? (
            <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3">
              <span className="inline-flex rounded-full border border-amber-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                Needs your approval
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-950">
                  {fleetGraph.result.approval.title}
                </p>
                <p className="text-sm text-amber-900/85">
                  {fleetGraph.result.approval.summary}
                </p>
                <p className="text-xs text-amber-900/75">
                  You stay in control. FleetGraph only acts after you confirm.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {fleetGraph.result.approval.options.map((option) => (
                  <button
                    className={optionClassName}
                    disabled
                    key={option.id}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
              No approval step is needed for this page right now.
            </p>
          )}

          <FleetGraphDebugDisclosure>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Thread</p>
              <p>{fleetGraph.result.entry.threadId}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Route surface</p>
              <p>{routeLabel(activeTab, nestedPath)}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Result surface</p>
              <p>{fleetGraph.result.summary.surfaceLabel}</p>
            </div>
            {fleetGraph.result.approval ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">Approval endpoint</p>
                <p>
                  {fleetGraph.result.approval.endpoint.method}
                  {' '}
                  {fleetGraph.result.approval.endpoint.path}
                </p>
              </div>
            ) : null}
          </FleetGraphDebugDisclosure>
        </div>
      ) : null}
    </section>
  );
}
