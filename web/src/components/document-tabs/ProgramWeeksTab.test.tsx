// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/hooks/useWeeksQuery', () => ({
  getCurrentSprintNumber: () => 3,
  useSprints: () => ({
    loading: false,
    sprints: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        issue_count: 3,
        name: 'Week 3',
        sprint_number: 3,
      },
    ],
    workspaceSprintStartDate: new Date('2026-03-01T00:00:00.000Z'),
  }),
}));

vi.mock('@/components/week/WeekTimeline', () => ({
  WeekTimeline: () => <div data-testid="week-timeline">Timeline</div>,
  getCurrentSprintNumber: () => 3,
}));

vi.mock('@/components/week/WeekDetailView', () => ({
  WeekDetailView: () => <div data-testid="week-detail-view">Week detail</div>,
}));

import ProgramWeeksTab from './ProgramWeeksTab';

function createWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/documents/:id/*" element={children} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe('ProgramWeeksTab', () => {
  it('lets the outer document page own vertical scrolling when a week is selected', async () => {
    render(
      <ProgramWeeksTab
        document={{ document_type: 'program', id: 'program-1', title: 'API Platform' }}
        documentId="program-1"
        nestedPath="11111111-1111-4111-8111-111111111111"
      />,
      {
        wrapper: createWrapper('/documents/program-1/weeks/11111111-1111-4111-8111-111111111111'),
      }
    );

    const tab = screen.getByTestId('program-weeks-tab');
    const detailPanel = screen.getByTestId('program-weeks-detail-panel');

    expect(tab).toHaveClass('min-h-full');
    expect(tab).not.toHaveClass('h-full');
    expect(detailPanel).toHaveClass('min-h-[36rem]');
    expect(detailPanel).not.toHaveClass('overflow-auto');
    expect(await screen.findByTestId('week-detail-view')).toBeInTheDocument();
  });
});
