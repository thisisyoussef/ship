import { useEffect, useMemo } from 'react';

import { useFleetGraphDebugSurface } from '@/components/FleetGraphDebugSurface';
import type { DocumentContext } from '@/hooks/useDocumentContextQuery';
import { useFleetGraphEntry } from '@/hooks/useFleetGraphEntry';
import { buildEntryDebugSnapshot } from '@/lib/fleetgraph-debug';
import type { FleetGraphEntryDocument } from '@/lib/fleetgraph-entry';

const buttonClassName =
  'rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';
const optionClassName =
  'rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground';
const sectionLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.16em] text-muted';

interface FleetGraphEntryCardProps {
  activeTab?: string;
  context?: DocumentContext;
  contextError?: string;
  document: FleetGraphEntryDocument;
  loading?: boolean;
  nestedPath?: string;
  userId: string;
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
  const approval = fleetGraph.result?.approval;
  const { setEntry } = useFleetGraphDebugSurface();

  const disabled = loading || !entry || !document.workspaceId;
  const helperText =
    contextError
    ?? (loading
      ? 'Loading the current Ship context for FleetGraph.'
      : document.workspaceId
        ? 'FleetGraph can review the page you are on and suggest the next step.'
        : 'This page is missing workspace details, so FleetGraph is unavailable here.');

  useEffect(() => {
    setEntry(
      fleetGraph.result
        ? buildEntryDebugSnapshot(fleetGraph.result, activeTab, nestedPath)
        : null
    );
  }, [activeTab, fleetGraph.result, nestedPath, setEntry]);

  return (
    <section className="rounded-xl border border-border bg-background px-4 py-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-1.5">
          <p className={sectionLabelClassName}>FleetGraph entry</p>
          <h2 className="text-sm font-semibold text-foreground">Help for this page</h2>
          <p className="text-sm text-muted">{helperText}</p>
        </div>

        <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
          <div className="space-y-1">
            <p className={sectionLabelClassName}>Quick actions</p>
            <p className="text-sm text-muted">
              Ask FleetGraph to review this page or show the approval path first.
            </p>
          </div>
          <div className="flex flex-col gap-2">
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
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
          <div className="space-y-1">
            <p className={sectionLabelClassName}>Current guidance</p>
            <p className="text-sm font-semibold text-foreground">{fleetGraph.result.summary.title}</p>
            <p className="text-sm text-muted">{fleetGraph.result.summary.detail}</p>
          </div>

          {approval ? (
            <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3">
              <p className={sectionLabelClassName}>Approval step</p>
              <span className="inline-flex rounded-full border border-amber-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                Needs your approval
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-950">
                  {approval.title}
                </p>
                <p className="text-sm text-amber-900/85">
                  {approval.summary}
                </p>
                <p className="text-xs text-amber-900/75">
                  You stay in control. FleetGraph only acts after you confirm.
                </p>
              </div>
              <div className="space-y-2 rounded-lg border border-amber-200/80 bg-white/55 px-3 py-3">
                <p className={sectionLabelClassName}>Why FleetGraph surfaced this</p>
                <p className="text-sm text-amber-950">
                  {approval.rationale}
                </p>
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
                      if (option.id === 'apply') fleetGraph.applyApproval(approval)
                      else if (option.id === 'dismiss') fleetGraph.dismissApproval()
                      else if (option.id === 'snooze') fleetGraph.snoozeApproval()
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
              No approval step is needed for this page right now.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
