import type { ComboboxOption } from '@/components/ui/Combobox';
import { useEffect, useRef, useState } from 'react';

import { FleetGraphFindingCard } from '@/components/FleetGraphFindingCard';
import { useFleetGraphDebugSurface } from '@/components/FleetGraphDebugSurface';
import type { DocumentContext } from '@/hooks/useDocumentContextQuery';
import { buildFindingDebugSnapshot } from '@/lib/fleetgraph-debug';
import { useFleetGraphFindings } from '@/hooks/useFleetGraphFindings';
import { buildFleetGraphFindingDocumentIds } from '@/lib/fleetgraph-findings';
import type {
  FleetGraphFinding,
  FleetGraphFindingReview,
} from '@/lib/fleetgraph-findings';
import {
  buildApplyNotice,
  buildDismissNotice,
  buildSnoozeNotice,
} from '@/lib/fleetgraph-findings-presenter';

interface FleetGraphFindingsPanelProps {
  context?: DocumentContext;
  currentDocumentId?: string;
  documentIds?: string[] | null;
  emptyStateMessage?: string;
  helperText?: string;
  loading?: boolean;
  onOpenDocument?: (finding: FleetGraphFinding) => void;
  ownerOptions?: ComboboxOption[];
  title?: string;
}

interface LocalNotice {
  message: string;
  tone: 'info' | 'success';
}

interface ReviewState {
  findingId: string | null;
  isReviewLoading: boolean;
  openedAt: number | null;
  review: FleetGraphFindingReview | null;
  selectedAssigneeId: string | null;
  selectedOwnerId: string | null;
}

const REVIEW_GESTURE_GUARD_MS = 450;
const EMPTY_REVIEW_STATE: ReviewState = {
  findingId: null,
  isReviewLoading: false,
  openedAt: null,
  review: null,
  selectedAssigneeId: null,
  selectedOwnerId: null,
};

function noticeToneClassName(tone: LocalNotice['tone']) {
  return tone === 'info'
    ? 'border-sky-200 bg-sky-50 text-sky-900'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function FleetGraphFindingsPanel({
  context,
  currentDocumentId,
  documentIds,
  emptyStateMessage,
  helperText,
  loading = false,
  onOpenDocument,
  ownerOptions = [],
  title = 'Proactive findings',
}: FleetGraphFindingsPanelProps) {
  const resolvedDocumentIds = documentIds !== undefined
    ? documentIds
    : currentDocumentId
      ? buildFleetGraphFindingDocumentIds(currentDocumentId, context)
      : [];
  const findings = useFleetGraphFindings(resolvedDocumentIds);
  const { setFindings } = useFleetGraphDebugSurface();
  const [reviewState, setReviewState] = useState<ReviewState>(EMPTY_REVIEW_STATE);
  const [localNotice, setLocalNotice] = useState<LocalNotice | null>(null);
  const snoozeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWorkspaceScope = documentIds === null;

  const resolvedHelperText = helperText ?? (
    loading
      ? 'Loading the surrounding Ship context for FleetGraph.'
      : isWorkspaceScope
        ? 'FleetGraph is sweeping the active workspace for proactive findings so you can triage them from one queue.'
        : 'FleetGraph is watching this page and related project context for anything that may need attention.'
  );
  const resolvedEmptyStateMessage = emptyStateMessage ?? (
    isWorkspaceScope
      ? 'No active proactive FleetGraph findings are open across this workspace right now.'
      : 'No active proactive FleetGraph findings are attached to this Ship context right now.'
  );

  useEffect(() => {
    setFindings(findings.findings.map((finding) =>
      buildFindingDebugSnapshot(
        finding,
        reviewState.findingId === finding.id ? reviewState.review?.threadId : undefined
      )
    ));
  }, [findings.findings, reviewState.findingId, reviewState.review, setFindings]);

  useEffect(() => () => {
    if (snoozeRefreshTimeoutRef.current !== null) {
      clearTimeout(snoozeRefreshTimeoutRef.current);
    }
  }, []);

  function scheduleSnoozeRefresh(snoozedUntil?: string) {
    if (snoozeRefreshTimeoutRef.current !== null) {
      clearTimeout(snoozeRefreshTimeoutRef.current);
      snoozeRefreshTimeoutRef.current = null;
    }

    if (!snoozedUntil) {
      return;
    }

    const delayMs = new Date(snoozedUntil).getTime() - Date.now();
    if (!Number.isFinite(delayMs)) {
      return;
    }

    snoozeRefreshTimeoutRef.current = setTimeout(() => {
      void findings.refetchFindings();
      snoozeRefreshTimeoutRef.current = null;
    }, Math.max(delayMs, 0) + 250);
  }

  async function handleDismiss(findingId: string) {
    setLocalNotice(null);
    findings.resetActionState();

    try {
      await findings.dismissFinding(findingId);
      setReviewState((current) =>
        current.findingId === findingId
          ? EMPTY_REVIEW_STATE
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

  async function handleSnooze(findingId: string, preset: '10s' | '4h') {
    setLocalNotice(null);
    findings.resetActionState();

    try {
      const snoozeInput = preset === '10s'
        ? { seconds: 10 }
        : { minutes: 240 }
      const response = await findings.snoozeFinding(findingId, snoozeInput);
      setReviewState((current) =>
        current.findingId === findingId
          ? EMPTY_REVIEW_STATE
          : current
      );
      setLocalNotice({
        message: buildSnoozeNotice(
          response.finding.snoozedUntil,
          preset === '10s' ? '10 seconds' : '4 hours'
        ),
        tone: 'info',
      });
      scheduleSnoozeRefresh(response.finding.snoozedUntil);
    } catch (error) {
      console.error('FleetGraph snooze failed:', error);
      // The hook surfaces the friendly error message.
    }
  }

  async function handleApply(findingId: string) {
    const finding = findings.findings.find((entry) => entry.id === findingId);
    const selectedAssigneeId = reviewState.findingId === findingId
      ? reviewState.selectedAssigneeId
      : null;
    const selectedAssigneeLabel = selectedAssigneeId
      ? ownerOptions.find((option) => option.value === selectedAssigneeId)?.label ?? null
      : null;
    const selectedOwnerId = reviewState.findingId === findingId
      ? reviewState.selectedOwnerId
      : null;
    const selectedOwnerLabel = selectedOwnerId
      ? ownerOptions.find((option) => option.value === selectedOwnerId)?.label ?? null
      : null;

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
      const input = finding?.recommendedAction?.type === 'assign_owner'
        ? (selectedOwnerId ? { ownerId: selectedOwnerId } : undefined)
        : finding?.recommendedAction?.type === 'assign_issues'
          ? (selectedAssigneeId ? { assigneeId: selectedAssigneeId } : undefined)
          : undefined;
      const response = await findings.applyFinding(findingId, input);
      setReviewState(EMPTY_REVIEW_STATE);

      const message = finding?.recommendedAction?.type === 'assign_owner'
        && selectedOwnerLabel
        && response.finding.actionExecution?.status === 'applied'
        ? `Sprint owner assigned in Ship. Look for Owner showing ${selectedOwnerLabel} on this page.`
        : finding?.recommendedAction?.type === 'assign_issues'
          && selectedAssigneeLabel
          && response.finding.actionExecution?.status === 'applied'
          ? `Sprint issues assigned in Ship. Look for Assignee showing ${selectedAssigneeLabel} on the sprint issues on this page.`
        : buildApplyNotice(response.finding);
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

    const finding = findings.findings.find((entry) => entry.id === findingId);
    if (
      finding?.recommendedAction?.type === 'assign_owner'
      || finding?.recommendedAction?.type === 'assign_issues'
    ) {
      setReviewState({
        findingId,
        isReviewLoading: false,
        openedAt: Date.now(),
        review: null,
        selectedAssigneeId: null,
        selectedOwnerId: null,
      });
      return;
    }

    try {
      const response = await findings.reviewFinding(findingId);
      setReviewState({
        findingId,
        isReviewLoading: false,
        openedAt: Date.now(),
        review: response.review,
        selectedAssigneeId: null,
        selectedOwnerId: null,
      });
    } catch (error) {
      console.error('FleetGraph review failed:', error);
      // The hook surfaces the friendly error message.
    }
  }

  async function handleReviewSelectionChange(
    findingId: string,
    selectionType: 'assignee' | 'owner',
    value: string | null
  ) {
    setLocalNotice(null);
    findings.resetActionState();
    setReviewState((current) =>
      current.findingId === findingId
        ? {
            ...current,
            isReviewLoading: value !== null,
            review: null,
            selectedAssigneeId: selectionType === 'assignee' ? value : null,
            selectedOwnerId: selectionType === 'owner' ? value : null,
          }
        : current
    );

    if (!value) {
      return;
    }

    try {
      const response = await findings.reviewFinding(
        findingId,
        selectionType === 'assignee'
          ? { assigneeId: value }
          : { ownerId: value }
      );
      setReviewState((current) => {
        const selectionStillMatches = selectionType === 'assignee'
          ? current.selectedAssigneeId === value
          : current.selectedOwnerId === value;
        if (current.findingId !== findingId || !selectionStillMatches) {
          return current;
        }

        return {
          ...current,
          isReviewLoading: false,
          review: response.review,
        };
      });
    } catch (error) {
      console.error('FleetGraph review failed:', error);
      setReviewState((current) => {
        const selectionStillMatches = selectionType === 'assignee'
          ? current.selectedAssigneeId === value
          : current.selectedOwnerId === value;
        if (current.findingId !== findingId || !selectionStillMatches) {
          return current;
        }

        return {
          ...current,
          isReviewLoading: false,
        };
      });
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
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{resolvedHelperText}</p>
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
          {resolvedEmptyStateMessage}
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
              onAssigneeChange={(value) => {
                void handleReviewSelectionChange(finding.id, 'assignee', value);
              }}
              onDismiss={(findingId) => {
                void handleDismiss(findingId);
              }}
              onOpenDocument={onOpenDocument}
              onOwnerChange={(value) => {
                void handleReviewSelectionChange(finding.id, 'owner', value);
              }}
              onReview={(findingId) => {
                void handleReview(findingId);
              }}
              onSnooze={(findingId, preset) => {
                void handleSnooze(findingId, preset);
              }}
              onCancelReview={() => setReviewState(EMPTY_REVIEW_STATE)}
              isReviewLoading={reviewState.findingId === finding.id ? reviewState.isReviewLoading : false}
              ownerOptions={ownerOptions}
              review={reviewState.findingId === finding.id ? reviewState.review : null}
              selectedAssigneeId={reviewState.findingId === finding.id ? reviewState.selectedAssigneeId : null}
              selectedOwnerId={reviewState.findingId === finding.id ? reviewState.selectedOwnerId : null}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
