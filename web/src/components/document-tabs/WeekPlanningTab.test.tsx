import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/IssuesList', () => ({
  DEFAULT_FILTER_TABS: [],
  IssuesList: () => <div data-testid="issues-list">Issues list</div>,
}));

vi.mock('@/hooks/useWeeksQuery', () => ({
  useActiveWeeksQuery: () => ({
    data: { weeks: [] },
  }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

import SprintPlanningTab from './WeekPlanningTab';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('WeekPlanningTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the planning tab shell shrinkable so issues can own the scroll area', () => {
    render(
      <SprintPlanningTab
        documentId="sprint-1"
        document={{
          belongs_to: [{ id: 'program-1', type: 'program' }],
          document_type: 'sprint',
          id: 'sprint-1',
          properties: { status: 'planning' },
          title: 'FleetGraph Demo Week - Review and Apply',
        }}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('week-planning-tab')).toHaveClass('min-h-0');
    expect(screen.getByTestId('issues-list').parentElement).toHaveClass('min-h-0');
  });
});
