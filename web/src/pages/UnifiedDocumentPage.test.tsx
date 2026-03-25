import { fireEvent, render, screen } from '@testing-library/react';
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

vi.mock('@/components/FleetGraphFindingsPanel', () => ({
  FleetGraphFindingsPanel: () => <div>FleetGraph proactive</div>,
}));

vi.mock('@/components/FleetGraphGuidedActionsOverlay', () => ({
  FleetGraphGuidedActionsOverlay: ({
    entry,
    isActionDisabled,
  }: {
    entry?: { document: { id: string } } | null
    isActionDisabled?: boolean
  }) => (
    <div>{`FleetGraph guided overlay ${entry?.document.id ?? 'none'} ${isActionDisabled ? 'disabled' : 'ready'}`}</div>
  ),
}));

vi.mock('@/components/FleetGraphFab', () => ({
  FleetGraphFab: ({
    autoAnalyzeContextKey,
    documentId,
  }: {
    autoAnalyzeContextKey?: string | null
    documentId: string
  }) => (
    <div>{`FleetGraph FAB ${documentId} analysis ${autoAnalyzeContextKey ?? 'none'}`}</div>
  ),
}));

vi.mock('@/hooks/useDocumentContextQuery', () => ({
  useDocumentContextQuery: () => ({
    data: undefined,
    error: undefined,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useFleetGraphFindings', () => ({
  useFleetGraphFindings: () => ({
    findings: [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useFleetGraphPageEntryInput', () => ({
  useFleetGraphPageEntryInput: () => ({
    entry: {
      activeTab: 'overview',
      context: {
        ancestors: [],
        belongs_to: [],
        breadcrumbs: [
          {
            id: 'sprint-1',
            title: 'FleetGraph Demo Week - Review and Apply',
            type: 'sprint',
          },
        ],
        children: [],
        current: {
          document_type: 'sprint',
          id: 'sprint-1',
          title: 'FleetGraph Demo Week - Review and Apply',
        },
      },
      document: {
        documentType: 'sprint',
        id: 'sprint-1',
        title: 'FleetGraph Demo Week - Review and Apply',
        workspaceId: 'workspace-1',
      },
      userId: 'user-1',
    },
    helperText: 'FleetGraph can review the page you are on and suggest the next step.',
    isActionDisabled: false,
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

function createDeferredDocument() {
  let resolve!: (value: Response) => void;

  const promise = new Promise<Response>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

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

  it('keeps FleetGraph hooks stable when the document page loads', async () => {
    const deferred = createDeferredDocument();
    vi.mocked(apiGet).mockReturnValue(deferred.promise);

    render(<UnifiedDocumentPage />, {
      wrapper: createWrapper('/documents/sprint-1'),
    });

    expect(await screen.findByText('Loading...')).toBeInTheDocument();

    deferred.resolve({
      ok: true,
      json: async () => ({
        created_at: '2026-03-17T00:00:00.000Z',
        created_by: 'user-1',
        document_type: 'sprint',
        id: 'sprint-1',
        plan_approval: { state: 'planning' },
        properties: { status: 'planning' },
        title: 'FleetGraph Demo Week - Review and Apply',
        updated_at: '2026-03-17T00:00:00.000Z',
        workspace_id: 'workspace-1',
      }),
    } as Response);

    expect(await screen.findByTestId('fleetgraph-document-page-shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open fleetgraph panel/i })).toBeInTheDocument();
    expect(screen.getByText('FleetGraph guided overlay sprint-1 ready')).toBeInTheDocument();
    expect(
      screen.getByText(
        'FleetGraph FAB sprint-1 analysis sprint-1::overview::root::2026-03-17T00:00:00.000Z'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('FleetGraph entry')).not.toBeInTheDocument();
  });

  it('keeps the FleetGraph week route in a page-level scroll shell', async () => {
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

    const pageShell = await screen.findByTestId('fleetgraph-document-page-shell');
    const tabContent = await screen.findByTestId('document-tab-content');

    expect(pageShell).toHaveClass('overflow-y-auto');
    expect(tabContent).not.toHaveClass('overflow-hidden');
  });

  it('keeps the guided overlay separate from the analysis FAB on document pages', async () => {
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

    expect(await screen.findByText('FleetGraph guided overlay sprint-1 ready')).toBeInTheDocument();
    expect(
      screen.getByText(
        'FleetGraph FAB sprint-1 analysis sprint-1::overview::root::2026-03-17T00:00:00.000Z'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('FleetGraph entry')).not.toBeInTheDocument();
  });

  it('passes the active tab through the FleetGraph auto-analysis context key', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      json: async () => ({
        created_at: '2026-03-17T00:00:00.000Z',
        created_by: 'user-1',
        document_type: 'sprint',
        id: 'sprint-1',
        properties: { status: 'active' },
        title: 'FleetGraph Demo Week - Review and Apply',
        updated_at: '2026-03-17T00:00:00.000Z',
        workspace_id: 'workspace-1',
      }),
    } as Response);

    render(<UnifiedDocumentPage />, {
      wrapper: createWrapper('/documents/sprint-1/review'),
    });

    expect(
      await screen.findByText(
        'FleetGraph FAB sprint-1 analysis sprint-1::review::root::2026-03-17T00:00:00.000Z'
      )
    ).toBeInTheDocument();
  });
});
