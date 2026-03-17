import { useEffect, useState } from 'react';

import { FleetGraphFindingCard } from '@/components/FleetGraphFindingCard';
import { useFleetGraphDebugSurface } from '@/components/FleetGraphDebugSurface';
import type { DocumentContext } from '@/hooks/useDocumentContextQuery';
import { buildFindingDebugSnapshot } from '@/lib/fleetgraph-debug';
import { useFleetGraphFindings } from '@/hooks/useFleetGraphFindings';
import { buildFleetGraphFindingDocumentIds } from '@/lib/fleetgraph-findings';
import type { FleetGraphFindingReview } from '@/lib/fleetgraph-findings';
import {
  buildApplyNotice,
  buildDismissNotice,
  buildSnoozeNotice,
} from '@/lib/fleetgraph-findings-presenter';

interface FleetGraphFindingsPanelProps {
  context?: DocumentContext;
  currentDocumentId: string;
  loading?: boolean;
}

interface LocalNotice {
  message: string;
  tone: 'info' | 'success';
}

interface ReviewState {
  findingId: string | null;
  openedAt: number | null;
  review: FleetGraphFindingReview | null;
}

const REVIEW_GESTURE_GUARD_MS = 450;

function noticeToneClassName(tone: LocalNotice['tone']) {
  return tone === 'info'
    ? 'border-sky-200 bg-sky-50 text-sky-900'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function FleetGraphFindingsPanel({
  context,
  currentDocumentId,
  loading = false,
}: FleetGraphFindingsPanelProps) {
  const documentIds = buildFleetGraphFindingDocumentIds(currentDocumentId, context);
  const findings = useFleetGraphFindings(documentIds);
  const { setFindings } = useFleetGraphDebugSurface();
  const [reviewState, setReviewState] = useState<ReviewState>({
    findingId: null,
    openedAt: null,
    review: null,
  });
  const [localNotice, setLocalNotice] = useState<LocalNotice | null>(null);

  const helperText = loading
    ? 'Loading the surrounding Ship context for FleetGraph.'
    : 'FleetGraph is watching this page and related project context for anything that may need attention.';

  useEffect(() => {
    setFindings(findings.findings.map((finding) =>
      buildFindingDebugSnapshot(
        finding,
        reviewState.findingId === finding.id ? reviewState.review?.threadId : undefined
      )
    ));
  }, [findings.findings, reviewState.findingId, reviewState.review, setFindings]);

  async function handleDismiss(findingId: string) {
    setLocalNotice(null);
    findings.resetActionState();

    try {
      await findings.dismissFinding(findingId);
      setReviewState((current) =>
        current.findingId === findingId
          ? { findingId: null, openedAt: null, review: null }
          : current
      );
      setLocalNotice({
        message: buildDismissNotice(),
        tone: 'info',
      });
    } catch (error) {
      console.error('FleetGraph dismiss failed:', error);
      // The hook surfaces the friendly error message.
    }
  }

  async function handleSnooze(findingId: string) {
    setLocalNotice(null);
    findings.resetActionState();

    try {
      const response = await findings.snoozeFinding(findingId, 240);
      setReviewState((current) =>
        current.findingId === findingId
          ? { findingId: null, openedAt: null, review: null }
          : current
      );
      setLocalNotice({
        message: buildSnoozeNotice(response.finding.snoozedUntil),
        tone: 'info',
      });
    } catch (error) {
      console.error('FleetGraph snooze failed:', error);
      // The hook surfaces the friendly error message.
    }
  }

  async function handleApply(findingId: string) {
    if (
      reviewState.findingId === findingId
      && reviewState.openedAt !== null
      && Date.now() - reviewState.openedAt < REVIEW_GESTURE_GUARD_MS
    ) {
      return;
    }

    setLocalNotice(null);
    findings.resetActionState();

    try {
      const response = await findings.applyFinding(findingId);
      setReviewState({ findingId: null, openedAt: null, review: null });

      const message = buildApplyNotice(response.finding);
      if (message) {
        setLocalNotice({
          message,
          tone: 'success',
        });
      }
    } catch (error) {
      console.error('FleetGraph apply failed:', error);
      // The hook surfaces the friendly error message.
    }
  }

  async function handleReview(findingId: string) {
    setLocalNotice(null);
    findings.resetActionState();

    try {
      const response = await findings.reviewFinding(findingId);
      setReviewState({
        findingId,
        openedAt: Date.now(),
        review: response.review,
      });
    } catch (error) {
      console.error('FleetGraph review failed:', error);
      // The hook surfaces the friendly error message.
    }
  }

  return (
    <section className="rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            FleetGraph proactive
          </p>
          <h2 className="text-sm font-semibold text-foreground">Week-start drift findings</h2>
          <p className="text-sm text-muted">{helperText}</p>
        </div>
      </div>

      {findings.loadErrorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {findings.loadErrorMessage}
        </p>
      ) : null}

      {findings.actionErrorMessage ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {findings.actionErrorMessage}
        </p>
      ) : null}

      {localNotice ? (
        <p
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${noticeToneClassName(localNotice.tone)}`}
        >
          {localNotice.message}
        </p>
      ) : null}

      {findings.isLoading || loading ? (
        <p className="mt-3 text-sm text-muted">FleetGraph is checking for active proactive findings.</p>
      ) : null}

      {!findings.isLoading && !loading && findings.findings.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted">
          No active proactive FleetGraph findings are attached to this Ship context right now.
        </p>
      ) : null}

      {findings.findings.length > 0 ? (
        <div className="mt-3 space-y-3">
          {findings.findings.map((finding) => (
            <FleetGraphFindingCard
              confirming={reviewState.findingId === finding.id}
              finding={finding}
              isMutating={findings.isMutating}
              key={finding.id}
              onApply={(findingId) => {
                void handleApply(findingId);
              }}
              onDismiss={(findingId) => {
                void handleDismiss(findingId);
              }}
              onReview={(findingId) => {
                void handleReview(findingId);
              }}
              onSnooze={(findingId) => {
                void handleSnooze(findingId);
              }}
              onCancelReview={() => setReviewState({ findingId: null, openedAt: null, review: null })}
              review={reviewState.findingId === finding.id ? reviewState.review : null}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
