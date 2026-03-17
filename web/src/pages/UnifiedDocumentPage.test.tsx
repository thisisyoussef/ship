import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiDelete: vi.fn(),
    apiGet: vi.fn(),
    apiPatch: vi.fn(),
    apiPost: vi.fn(),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Demo User' },
  }),
}));

vi.mock('@/hooks/useTeamMembersQuery', () => ({
  useAssignableMembersQuery: () => ({ data: [] }),
}));

vi.mock('@/hooks/useProgramsQuery', () => ({
  useProgramsQuery: () => ({ data: [] }),
}));

vi.mock('@/hooks/useProjectsQuery', () => ({
  projectKeys: { lists: () => ['projects', 'list'] },
  useProjectWeeksQuery: () => ({ data: [] }),
  useProjectsQuery: () => ({ data: [] }),
}));

vi.mock('@/hooks/useDocumentConversion', () => ({
  useDocumentConversion: () => ({
    convert: vi.fn(),
    isConverting: false,
  }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useIssuesQuery', () => ({
  issueKeys: { lists: () => ['issues', 'list'] },
}));

vi.mock('@/contexts/CurrentDocumentContext', () => ({
  useCurrentDocument: () => ({
    clearCurrentDocument: vi.fn(),
    setCurrentDocument: vi.fn(),
  }),
}));

vi.mock('@/components/FleetGraphEntryCard', () => ({
  FleetGraphEntryCard: () => <div>FleetGraph entry</div>,
}));

vi.mock('@/components/FleetGraphFindingsPanel', () => ({
  FleetGraphFindingsPanel: () => <div>FleetGraph proactive</div>,
}));

vi.mock('@/hooks/useDocumentContextQuery', () => ({
  useDocumentContextQuery: () => ({
    data: undefined,
    error: undefined,
    isLoading: false,
  }),
}));

vi.mock('@/components/UnifiedEditor', () => ({
  UnifiedEditor: () => <div data-testid="mock-unified-editor">Unified editor</div>,
}));

vi.mock('@/components/ui/TabBar', () => ({
  TabBar: () => <div>Tab bar</div>,
}));

vi.mock('@/components/document-tabs/WeekOverviewTab', () => ({
  default: () => <div data-testid="week-overview-tab">Week overview</div>,
}));

import { apiGet } from '@/lib/api';
import { UnifiedDocumentPage } from './UnifiedDocumentPage';

function createWrapper(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/documents/:id/*" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('UnifiedDocumentPage', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it('keeps sprint tab content inside a shrinkable shell so the inner week surface can scroll', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      json: async () => ({
        created_at: '2026-03-17T00:00:00.000Z',
        created_by: 'user-1',
        document_type: 'sprint',
        id: 'sprint-1',
        properties: { status: 'planning' },
        title: 'FleetGraph Demo Week - Review and Apply',
        updated_at: '2026-03-17T00:00:00.000Z',
        workspace_id: 'workspace-1',
      }),
    } as Response);

    render(<UnifiedDocumentPage />, {
      wrapper: createWrapper('/documents/sprint-1'),
    });

    const tabContent = await screen.findByTestId('document-tab-content');
    expect(tabContent).toHaveClass('min-h-0');
  });
});
