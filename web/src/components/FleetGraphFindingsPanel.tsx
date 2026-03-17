import { useState } from 'react';

import type { DocumentContext } from '@/hooks/useDocumentContextQuery';
import { useFleetGraphFindings } from '@/hooks/useFleetGraphFindings';
import {
  buildFleetGraphFindingDocumentIds,
  type FleetGraphFinding,
} from '@/lib/fleetgraph-findings';

const buttonClassName = 'rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';
const actionClassName = 'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800';
const applyButtonClassName = 'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';

function formatTimestamp(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString();
}

function renderFindingStatus(finding: FleetGraphFinding) {
  if (finding.snoozedUntil) {
    return `Snoozed until ${formatTimestamp(finding.snoozedUntil)}`;
  }
  if (finding.cooldownUntil) {
    return `Cooldown recorded ${formatTimestamp(finding.cooldownUntil)}`;
  }
  return `Updated ${formatTimestamp(finding.updatedAt)}`;
}

function renderExecutionTone(finding: FleetGraphFinding) {
  switch (finding.actionExecution?.status) {
    case 'applied':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'already_applied':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-900';
  }
}

function renderExecutionLabel(finding: FleetGraphFinding) {
  switch (finding.actionExecution?.status) {
    case 'applied':
      return 'Applied through Ship'
    case 'already_applied':
      return 'Already active in Ship'
    case 'failed':
      return 'Ship action failed'
    case 'pending':
      return 'Applying in Ship'
    default:
      return 'Recommended Ship action'
  }
}

interface FleetGraphFindingsPanelProps {
  context?: DocumentContext;
  currentDocumentId: string;
  loading?: boolean;
}

export function FleetGraphFindingsPanel({
  context,
  currentDocumentId,
  loading = false,
}: FleetGraphFindingsPanelProps) {
  const documentIds = buildFleetGraphFindingDocumentIds(currentDocumentId, context);
  const findings = useFleetGraphFindings(documentIds);
  const [confirmingFindingId, setConfirmingFindingId] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const helperText = loading
    ? 'Loading related Ship context for proactive FleetGraph findings.'
    : 'FleetGraph is showing active proactive findings tied to this document and its related Ship context.';

  return (
    <section className="rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            FleetGraph proactive
          </p>
          <h2 className="text-sm font-semibold text-foreground">
            Week-start drift findings
          </h2>
          <p className="text-sm text-muted">
            {helperText}
          </p>
        </div>
      </div>

      {findings.errorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {findings.errorMessage}
        </p>
      ) : null}

      {localNotice ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {localNotice}
        </p>
      ) : null}

      {findings.isLoading || loading ? (
        <p className="mt-3 text-sm text-muted">
          FleetGraph is checking for active proactive findings.
        </p>
      ) : null}

      {!findings.isLoading && !loading && findings.findings.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted">
          No active proactive FleetGraph findings are attached to this Ship context right now.
        </p>
      ) : null}

      {findings.findings.length > 0 ? (
        <div className="mt-3 space-y-3">
          {findings.findings.map((finding) => (
            <article
              key={finding.id}
              className="rounded-md border border-border bg-muted/30 px-3 py-3"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {finding.title}
                    </p>
                    <p className="text-sm text-muted">
                      {finding.summary}
                    </p>
                    <p className="text-xs text-muted">
                      {renderFindingStatus(finding)}
                    </p>
                  </div>

                  <ul className="space-y-1 text-sm text-foreground">
                    {finding.evidence.map((item) => (
                      <li key={item} className="list-disc pl-5">
                        {item}
                      </li>
                    ))}
                  </ul>

                  {finding.recommendedAction ? (
                    <div className={`space-y-2 rounded-md border px-3 py-2 ${renderExecutionTone(finding)}`}>
                      <span className={actionClassName}>
                        {renderExecutionLabel(finding)}
                      </span>
                      <p className="text-sm font-medium text-amber-900">
                        {finding.recommendedAction.title}
                      </p>
                      <p className="text-sm text-amber-900/80">
                        {finding.recommendedAction.summary}
                      </p>
                      <p className="text-xs text-amber-900/70">
                        {finding.recommendedAction.endpoint.method} {finding.recommendedAction.endpoint.path}
                      </p>
                      {finding.actionExecution ? (
                        <div className="space-y-1 text-xs">
                          <p>{finding.actionExecution.message}</p>
                          <p>
                            Attempt {finding.actionExecution.attemptCount}
                            {' '}• Updated {formatTimestamp(finding.actionExecution.updatedAt)}
                          </p>
                        </div>
                      ) : confirmingFindingId === finding.id ? (
                        <div className="space-y-2 rounded-md border border-emerald-200 bg-white/70 px-3 py-3">
                          <p className="text-sm font-medium text-foreground">
                            Review before apply
                          </p>
                          <p className="text-sm text-muted">
                            FleetGraph will call the existing Ship REST route to start this week. This changes live Ship state only after your explicit confirmation.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className={applyButtonClassName}
                              disabled={findings.isMutating}
                              onClick={() => {
                                findings.applyFinding(finding.id);
                                setConfirmingFindingId(null);
                              }}
                              type="button"
                            >
                              Apply start week
                            </button>
                            <button
                              className={buttonClassName}
                              disabled={findings.isMutating}
                              onClick={() => setConfirmingFindingId(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={applyButtonClassName}
                            disabled={findings.isMutating}
                            onClick={() => setConfirmingFindingId(finding.id)}
                            type="button"
                          >
                            Review and apply
                          </button>
                          <p className="text-xs text-amber-900/70">
                            This stays behind a human confirmation gate and executes through Ship&apos;s existing week-start route.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {finding.tracePublicUrl ? (
                    <a
                      className="inline-flex text-xs font-medium text-accent hover:underline"
                      href={finding.tracePublicUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open trace evidence
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className={buttonClassName}
                    disabled={findings.isMutating}
                    onClick={() => {
                      findings.dismissFinding(finding.id);
                      setConfirmingFindingId((current) => current === finding.id ? null : current);
                      setLocalNotice('Finding dismissed. Future proactive sweeps will keep it suppressed until reopened.');
                    }}
                    type="button"
                  >
                    Dismiss
                  </button>
                  <button
                    className={buttonClassName}
                    disabled={findings.isMutating}
                    onClick={() => {
                      findings.snoozeFinding(finding.id, 240);
                      setConfirmingFindingId((current) => current === finding.id ? null : current);
                      setLocalNotice('Finding snoozed for 4 hours. FleetGraph will keep it quiet until the snooze expires.');
                    }}
                    type="button"
                  >
                    Snooze 4h
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
