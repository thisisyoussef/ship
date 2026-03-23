import { describe, expect, it } from 'vitest';

import {
  buildFindingSummary,
  canReviewFindingActionInFleetGraph,
  renderExecutionLabel,
} from '@/lib/fleetgraph-findings-presenter';
import type { FleetGraphFinding } from '@/lib/fleetgraph-findings';

function makeFinding(
  overrides: Partial<FleetGraphFinding> = {}
): FleetGraphFinding {
  return {
    dedupeKey: 'dedupe-1',
    documentId: 'sprint-1',
    documentType: 'sprint',
    evidence: ['Sprint 8 is still planning after the expected start window.'],
    findingKey: 'week-start-drift:workspace-1:sprint-8',
    findingType: 'week_start_drift',
    id: 'finding-1',
    metadata: {},
    status: 'active',
    summary: 'Sprint 8 still needs attention.',
    threadId: 'fleetgraph:workspace-1:scheduled-sweep',
    title: 'Week start drift: Sprint 8',
    updatedAt: '2026-03-17T12:00:00.000Z',
    workspaceId: 'workspace-1',
    ...overrides,
  };
}

describe('fleetgraph findings presenter', () => {
  it('keeps non-week-start summaries generic on the shared proactive surface', () => {
    const finding = makeFinding({
      findingKey: 'sprint-no-owner:workspace-1:sprint-8',
      findingType: 'sprint_no_owner',
      summary: 'Sprint 8 needs a named owner before work coordination slips.',
      title: 'Sprint owner gap: Sprint 8',
    });

    expect(buildFindingSummary(finding))
      .toBe('Sprint 8 needs a named owner before work coordination slips.');
  });

  it('keeps execution labels generic when no Ship write has run', () => {
    expect(renderExecutionLabel(makeFinding())).toBe('Suggested next step');
  });

  it('treats assign-owner findings as reviewable in FleetGraph', () => {
    const finding = makeFinding({
      recommendedAction: {
        body: {
          owner_id: 'user-1',
        },
        endpoint: {
          method: 'PATCH',
          path: '/api/documents/sprint-1',
        },
        evidence: ['No sprint owner is assigned right now.'],
        rationale: 'Assigning accountability should stay a human-reviewed action.',
        summary: 'Assign yourself as sprint owner so someone is accountable for coordination and follow-through.',
        targetId: 'sprint-1',
        targetType: 'sprint',
        title: 'Assign sprint owner',
        type: 'assign_owner',
      },
    });

    expect(canReviewFindingActionInFleetGraph(finding)).toBe(true);
  });

  it('treats assign-issues findings as reviewable in FleetGraph', () => {
    const finding = makeFinding({
      recommendedAction: {
        body: {
          issue_ids: ['issue-1', 'issue-2', 'issue-3'],
        },
        endpoint: {
          method: 'POST',
          path: '/api/issues/bulk',
        },
        evidence: ['3 of 5 issues in this sprint have no assignee.'],
        rationale: 'Assignment should remain a human-reviewed action in Ship.',
        summary: 'Assign the unassigned sprint issues or make an explicit call to leave them unassigned.',
        targetId: 'sprint-1',
        targetType: 'sprint',
        title: 'Assign sprint issues',
        type: 'assign_issues',
      },
    });

    expect(canReviewFindingActionInFleetGraph(finding)).toBe(true);
  });

  it('shows assign-owner execution labels after apply succeeds', () => {
    const finding = makeFinding({
      actionExecution: {
        actionType: 'assign_owner',
        attemptCount: 1,
        endpoint: {
          method: 'PATCH',
          path: '/api/documents/sprint-1',
        },
        findingId: 'finding-1',
        message: 'Sprint owner assigned in Ship. Look for Owner showing the person you selected on this page.',
        status: 'applied',
        updatedAt: '2026-03-17T12:05:00.000Z',
      },
    });

    expect(renderExecutionLabel(finding)).toBe('Owner assigned in Ship');
  });

  it('shows assign-issues execution labels after apply succeeds', () => {
    const finding = makeFinding({
      actionExecution: {
        actionType: 'assign_issues',
        attemptCount: 1,
        endpoint: {
          method: 'POST',
          path: '/api/issues/bulk',
        },
        findingId: 'finding-1',
        message: 'Sprint issues assigned in Ship. Look for Assignee showing the person you selected on the sprint issues on this page.',
        status: 'applied',
        updatedAt: '2026-03-17T12:05:00.000Z',
      },
    });

    expect(renderExecutionLabel(finding)).toBe('Issues assigned in Ship');
  });
});
