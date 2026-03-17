import { FleetGraphDebugDisclosure } from '@/components/FleetGraphDebugDisclosure';
import type { FleetGraphFinding } from '@/lib/fleetgraph-findings';
import {
  formatFleetGraphTimestamp,
  renderExecutionLabel,
  renderExecutionTone,
  renderFindingStatus,
} from '@/lib/fleetgraph-findings-presenter';

const buttonClassName =
  'rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';
const actionClassName =
  'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800';
const applyButtonClassName =
  'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';

interface FleetGraphFindingCardProps {
  confirming: boolean;
  finding: FleetGraphFinding;
  isMutating: boolean;
  onApply: (findingId: string) => void;
  onCancelReview: () => void;
  onDismiss: (findingId: string) => void;
  onReview: (findingId: string) => void;
  onSnooze: (findingId: string) => void;
}

function FindingEvidenceList({ finding }: { finding: FleetGraphFinding }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Why this was flagged
      </p>
      <ul className="space-y-2">
        {finding.evidence.map((item) => (
          <li
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            key={item}
          >
            {item}
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
}: FleetGraphFindingCardProps) {
  return (
    <article className="rounded-md border border-border bg-muted/30 px-3 py-3">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{finding.title}</p>
            <p className="text-sm text-muted">{finding.summary}</p>
            <p className="text-xs text-muted">{renderFindingStatus(finding)}</p>
          </div>

          <FindingEvidenceList finding={finding} />

          {finding.recommendedAction ? (
            <div className={`space-y-3 rounded-md border px-3 py-3 ${renderExecutionTone(finding)}`}>
              <span className={actionClassName}>{renderExecutionLabel(finding)}</span>
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
                    <p className="text-sm font-medium text-foreground">
                      Review before starting this week
                    </p>
                    <p className="text-sm text-muted">
                      FleetGraph thinks this week is ready to start. Nothing changes in Ship until you confirm.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={applyButtonClassName}
                      disabled={isMutating}
                      onClick={() => onApply(finding.id)}
                      type="button"
                    >
                      Start week in Ship
                    </button>
                    <button
                      className={buttonClassName}
                      disabled={isMutating}
                      onClick={onCancelReview}
                      type="button"
                    >
                      Cancel
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

          <FleetGraphDebugDisclosure>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Thread</p>
              <p>{finding.threadId}</p>
            </div>
            {finding.recommendedAction ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">Action endpoint</p>
                <p>
                  {finding.recommendedAction.endpoint.method}
                  {' '}
                  {finding.recommendedAction.endpoint.path}
                </p>
              </div>
            ) : null}
            {finding.tracePublicUrl ? (
              <a
                className="inline-flex font-medium text-accent hover:underline"
                href={finding.tracePublicUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open trace evidence
              </a>
            ) : null}
          </FleetGraphDebugDisclosure>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
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
      </div>
    </article>
  );
}
