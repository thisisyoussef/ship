import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FleetGraphFindingCard } from './FleetGraphFindingCard';

const finding = {
  dedupeKey: 'week-start-drift',
  documentId: 'week-1',
  documentType: 'sprint',
  evidence: ['The week is still planning after the expected start window.'],
  findingKey: 'finding-1',
  findingType: 'week_start_drift',
  id: 'finding-1',
  metadata: {},
  recommendedAction: {
    endpoint: {
      method: 'POST' as const,
      path: '/api/weeks/week-1/start',
    },
    evidence: ['The week is still planning after the expected start window.'],
    rationale: 'This week should be active by now.',
    summary: 'Start the week so the team can begin tracking work.',
    targetId: 'week-1',
    targetType: 'sprint' as const,
    title: 'Start this week',
    type: 'start_week' as const,
  },
  status: 'active' as const,
  summary: 'This week should be underway by now, but it is still marked as planning.',
  threadId: 'fleetgraph:workspace-1:analyze:week-1',
  title: 'Week start drift',
  updatedAt: '2026-03-19T10:00:00.000Z',
  workspaceId: 'workspace-1',
};

describe('FleetGraphFindingCard', () => {
  it('renders review evidence with human-friendly facts instead of raw machine keys', () => {
    render(
      <FleetGraphFindingCard
        confirming
        finding={finding}
        isMutating={false}
        onApply={vi.fn()}
        onCancelReview={vi.fn()}
        onDismiss={vi.fn()}
        onReview={vi.fn()}
        onSnooze={vi.fn()}
        review={{
          cancelLabel: 'Cancel',
          confirmLabel: 'Start week',
          evidence: [
            'hoursSinceStart: 94.13318472222223',
            'sprintStartDate: 2026-03-16T00:00:00.000Z',
            'status: planning',
            'entityTitle: FleetGraph Demo Week - Review and Apply',
          ],
          summary: 'This week has passed its planned start, but Ship still lists it as Planning.',
          threadId: 'fleetgraph:workspace-1:analyze:week-1:action:start_week:week-1',
          title: 'Start this week in Ship?',
        }}
      />
    );

    expect(screen.getByText('Time since planned start')).toBeInTheDocument();
    expect(screen.getByText('3 days, 22 hours')).toBeInTheDocument();
    expect(screen.getByText('Scheduled start')).toBeInTheDocument();
    expect(screen.getByText('Current Ship status')).toBeInTheDocument();
    expect(screen.getByText('Week name')).toBeInTheDocument();
    expect(screen.queryByText('hoursSinceStart: 94.13318472222223')).not.toBeInTheDocument();
  });

  it('keeps the review action interactive', () => {
    const onApply = vi.fn();

    render(
      <FleetGraphFindingCard
        confirming
        finding={finding}
        isMutating={false}
        onApply={onApply}
        onCancelReview={vi.fn()}
        onDismiss={vi.fn()}
        onReview={vi.fn()}
        onSnooze={vi.fn()}
        review={{
          cancelLabel: 'Cancel',
          confirmLabel: 'Start week',
          evidence: [],
          summary: 'This week has passed its planned start, but Ship still lists it as Planning.',
          threadId: 'fleetgraph:workspace-1:analyze:week-1:action:start_week:week-1',
          title: 'Start this week in Ship?',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start week' }));

    expect(onApply).toHaveBeenCalledWith('finding-1');
  });
});
