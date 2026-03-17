import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
  };
});

import { apiGet, apiPost } from '@/lib/api';
import { FleetGraphFindingsPanel } from './FleetGraphFindingsPanel';

const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333';
const SPRINT_ID = '55555555-5555-4555-8555-555555555555';

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

function createContext() {
  return {
    ancestors: [],
    belongs_to: [
      {
        color: '#1d4ed8',
        document_type: 'sprint',
        id: SPRINT_ID,
        title: 'Sprint 8',
        type: 'sprint' as const,
      },
    ],
    breadcrumbs: [],
    children: [],
    current: {
      document_type: 'project',
      id: DOCUMENT_ID,
      title: 'Launch planner',
    },
  };
}

describe('FleetGraphFindingsPanel', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
    vi.mocked(apiPost).mockReset();
  });

  it('renders an active week-start drift finding for the current Ship context', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      json: async () => ({
        findings: [
          {
            dedupeKey: 'dedupe-1',
            documentId: SPRINT_ID,
            documentType: 'sprint',
            evidence: [
              'Sprint 8 is still planning after the expected week-start boundary.',
              'No active work has started in the current week.',
            ],
            findingKey: 'week-start-drift:workspace-1:sprint-8',
            findingType: 'week_start_drift',
            id: 'finding-1',
            metadata: {},
            recommendedAction: {
              endpoint: {
                method: 'POST',
                path: `/api/weeks/${SPRINT_ID}/start`,
              },
              evidence: ['The week is still planning after its start threshold.'],
              rationale: 'Starting the week is the recommended next Ship action.',
              summary: 'Start Sprint 8 when the PM confirms the timing.',
              targetId: SPRINT_ID,
              targetType: 'sprint',
              title: 'Start Sprint 8',
              type: 'start_week',
            },
            status: 'active',
            summary: 'Sprint 8 looks late to start and still has no active week signal.',
            threadId: 'fleetgraph:workspace-1:scheduled-sweep',
            title: 'Week start drift: Sprint 8',
            tracePublicUrl: 'https://smith.langchain.com/public/example/r',
            updatedAt: '2026-03-17T12:00:00.000Z',
            workspaceId: 'workspace-1',
          },
        ],
      }),
    } as Response);

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText('Week start drift: Sprint 8')).toBeInTheDocument();
    expect(screen.getByText('Start Sprint 8')).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith(
      `/api/fleetgraph/findings?documentIds=${encodeURIComponent(`${DOCUMENT_ID},${SPRINT_ID}`)}`
    );
  });

  it('dismisses a visible finding and shows the local lifecycle notice', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      json: async () => ({
        findings: [
          {
            dedupeKey: 'dedupe-1',
            documentId: SPRINT_ID,
            documentType: 'sprint',
            evidence: ['Sprint 8 is still planning after the expected week-start boundary.'],
            findingKey: 'week-start-drift:workspace-1:sprint-8',
            findingType: 'week_start_drift',
            id: 'finding-1',
            metadata: {},
            status: 'active',
            summary: 'Sprint 8 looks late to start.',
            threadId: 'fleetgraph:workspace-1:scheduled-sweep',
            title: 'Week start drift: Sprint 8',
            updatedAt: '2026-03-17T12:00:00.000Z',
            workspaceId: 'workspace-1',
          },
        ],
      }),
    } as Response);
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      json: async () => ({
        finding: {
          id: 'finding-1',
          status: 'dismissed',
        },
      }),
    } as Response);

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/dismiss');
    });

    expect(
      screen.getByText(/Future proactive sweeps will keep it suppressed until reopened/i)
    ).toBeInTheDocument();
  });
});
