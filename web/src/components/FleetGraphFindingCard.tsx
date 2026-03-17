import type {
  FleetGraphFinding,
  FleetGraphFindingReview,
} from '@/lib/fleetgraph-findings';
import {
  buildFindingSummary,
  formatFleetGraphTimestamp,
  renderExecutionLabel,
  renderExecutionTone,
  renderFindingStatus,
} from '@/lib/fleetgraph-findings-presenter';

const buttonClassName =
  'rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';
const actionClassName =
  'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800';
const applyButtonClassName =
  'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';
const sectionLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.16em] text-muted';

interface FleetGraphFindingCardProps {
  confirming: boolean;
  finding: FleetGraphFinding;
  isMutating: boolean;
  onApply: (findingId: string) => void;
  onCancelReview: () => void;
  onDismiss: (findingId: string) => void;
  onReview: (findingId: string) => void;
  onSnooze: (findingId: string) => void;
  review?: FleetGraphFindingReview | null;
}

function FindingEvidenceList({ finding }: { finding: FleetGraphFinding }) {
  return (
    <div className="space-y-2.5">
      <p className={sectionLabelClassName}>Why this matters</p>
      <ul className="list-none space-y-2 p-0">
        {finding.evidence.map((item) => (
          <li
            className="flex gap-3 rounded-lg border border-border/80 bg-background px-3 py-2.5 text-sm text-foreground"
            key={item}
          >
            <span
              aria-hidden="true"
              className="mt-1.5 h-2 w-2 flex-none rounded-full bg-slate-400"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FleetGraphFindingCard({
  confirming,
  finding,
  isMutating,
  onApply,
  onCancelReview,
  onDismiss,
  onReview,
  onSnooze,
  review,
}: FleetGraphFindingCardProps) {
  const executionLabel = finding.actionExecution ? renderExecutionLabel(finding) : null;

  return (
    <article className="rounded-xl border border-border bg-muted/20 px-4 py-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className={sectionLabelClassName}>Active finding</p>
            <p className="text-sm font-semibold text-foreground">{finding.title}</p>
            <p className="text-sm text-muted">{buildFindingSummary(finding)}</p>
            <p className="text-xs text-muted">{renderFindingStatus(finding)}</p>
          </div>

          <FindingEvidenceList finding={finding} />

          {finding.recommendedAction ? (
            <div className={`space-y-3 rounded-xl border px-3 py-3 ${renderExecutionTone(finding)}`}>
              <div className="space-y-2">
                <p className={sectionLabelClassName}>Suggested next step</p>
                {executionLabel ? <span className={actionClassName}>{executionLabel}</span> : null}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{finding.recommendedAction.title}</p>
                <p className="text-sm opacity-90">{finding.recommendedAction.summary}</p>
              </div>

              {finding.actionExecution ? (
                <div className="space-y-1 text-xs opacity-90">
                  <p>{finding.actionExecution.message}</p>
                  <p>
                    Attempt {finding.actionExecution.attemptCount}
                    {' '}• Updated {formatFleetGraphTimestamp(finding.actionExecution.updatedAt)}
                  </p>
                </div>
              ) : confirming ? (
                <div className="space-y-3 rounded-md border border-emerald-200 bg-white/70 px-3 py-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-950">
                      {review?.title ?? 'Confirm before starting this week'}
                    </p>
                    <p className="text-sm text-slate-700">
                      {review?.summary
                        ?? 'FleetGraph thinks this week is ready to start. Nothing changes in Ship until you confirm.'}
                    </p>
                  </div>
                  {review?.evidence.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {review.evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      className={buttonClassName}
                      disabled={isMutating}
                      onClick={onCancelReview}
                      type="button"
                    >
                      {review?.cancelLabel ?? 'Cancel'}
                    </button>
                    <button
                      className={applyButtonClassName}
                      disabled={isMutating}
                      onClick={() => onApply(finding.id)}
                      type="button"
                    >
                      {review?.confirmLabel ?? 'Start week in Ship'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={applyButtonClassName}
                    disabled={isMutating}
                    onClick={() => onReview(finding.id)}
                    type="button"
                  >
                    Review and apply
                  </button>
                  <p className="text-xs opacity-90">
                    You review this first. FleetGraph only acts after you confirm.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <aside className="space-y-3 rounded-xl border border-border/80 bg-background px-3 py-3">
          <div className="space-y-1">
            <p className={sectionLabelClassName}>Quick actions</p>
            <p className="text-sm text-muted">
              Hide this signal for now or ask FleetGraph to check back later.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className={buttonClassName}
              disabled={isMutating}
              onClick={() => onDismiss(finding.id)}
              type="button"
            >
              Dismiss
            </button>
            <button
              className={buttonClassName}
              disabled={isMutating}
              onClick={() => onSnooze(finding.id)}
              type="button"
            >
              Snooze 4h
            </button>
          </div>
        </aside>
      </div>
    </article>
  );
}
