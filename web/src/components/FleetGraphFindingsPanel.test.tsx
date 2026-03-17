import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, reject, resolve };
}

describe('FleetGraphFindingsPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.mocked(apiGet).mockReset();
    vi.mocked(apiPost).mockReset();
  });

  it('renders an active week-start drift finding without technical details in the main card', async () => {
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
            metadata: {
              issueCount: 0,
              statusReason: 'zero_issues_after_start',
            },
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
            summary: 'Sprint 8 starts 2026-03-17 and is active; prioritize attention to ensure demos run smoothly and catch any last-minute issues (0 reported).',
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
    expect(
      screen.getByText('This week has reached its start window, but it still has no linked work.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/prioritize attention to ensure demos run smoothly/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(`POST /api/weeks/${SPRINT_ID}/start`)).not.toBeInTheDocument();
    expect(screen.queryByText('fleetgraph:workspace-1:scheduled-sweep')).not.toBeInTheDocument();

    expect(apiGet).toHaveBeenCalledWith(
      `/api/fleetgraph/findings?documentIds=${encodeURIComponent(`${DOCUMENT_ID},${SPRINT_ID}`)}`
    );
  });

  it('groups evidence and secondary actions with clearer hierarchy labels', async () => {
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
            metadata: {
              statusReason: 'planning_after_start',
            },
            recommendedAction: {
              endpoint: {
                method: 'POST',
                path: `/api/weeks/${SPRINT_ID}/start`,
              },
              evidence: ['The week is still planning after the expected start date.'],
              rationale: 'Starting the week is the recommended next Ship action.',
              summary: 'Start Sprint 8 when the PM confirms the timing.',
              targetId: SPRINT_ID,
              targetType: 'sprint',
              title: 'Start Sprint 8',
              type: 'start_week',
            },
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

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText('Week start drift: Sprint 8')).toBeInTheDocument();
    expect(screen.getByText('Why this matters')).toBeInTheDocument();
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Snooze 10s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Snooze 4h' })).toBeInTheDocument();
  });

  it('waits for confirmed dismiss success before showing the lifecycle notice', async () => {
    const dismissDeferred = createDeferred<Response>();
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
    vi.mocked(apiPost).mockImplementation(() => dismissDeferred.promise);

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));

    expect(
      screen.queryByText(/hidden for now/i)
    ).not.toBeInTheDocument();

    dismissDeferred.resolve({
      ok: true,
      json: async () => ({
        finding: {
          id: 'finding-1',
          status: 'dismissed',
        },
      }),
    } as Response);

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/dismiss');
    });

    expect(
      await screen.findByText(/hidden for now/i)
    ).toBeInTheDocument();
  });

  it('waits for confirmed snooze success before showing the lifecycle notice', async () => {
    const snoozeDeferred = createDeferred<Response>();
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
    vi.mocked(apiPost).mockImplementation(() => snoozeDeferred.promise);

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Snooze 4h' }));

    expect(screen.queryByText(/snoozed until/i)).not.toBeInTheDocument();

    snoozeDeferred.resolve({
      ok: true,
      json: async () => ({
        finding: {
          id: 'finding-1',
          snoozedUntil: '2026-03-17T16:00:00.000Z',
          status: 'snoozed',
        },
      }),
    } as Response);

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/snooze', { minutes: 240 });
    });

    expect(
      await screen.findByText(/snoozed until/i)
    ).toBeInTheDocument();
  });

  it('supports a demo snooze preset with 10-second duration', async () => {
    const snoozeDeferred = createDeferred<Response>();
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
    vi.mocked(apiPost).mockImplementation(() => snoozeDeferred.promise);

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Snooze 10s' }));

    snoozeDeferred.resolve({
      ok: true,
      json: async () => ({
        finding: {
          id: 'finding-1',
          snoozedUntil: '2026-03-17T12:00:10.000Z',
          status: 'snoozed',
        },
      }),
    } as Response);

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/snooze', { seconds: 10 });
    });

    expect(
      await screen.findByText(/snoozed until/i)
    ).toBeInTheDocument();
  });

  it('refetches findings when a demo snooze expires so the item can return', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T18:51:18.000Z'));

    const snoozeDeferred = createDeferred<Response>();
    vi.mocked(apiGet)
      .mockResolvedValueOnce({
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
              updatedAt: '2026-03-17T18:51:18.000Z',
              workspaceId: 'workspace-1',
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ findings: [] }),
      } as Response)
      .mockResolvedValueOnce({
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
              updatedAt: '2026-03-17T18:51:28.250Z',
              workspaceId: 'workspace-1',
            },
          ],
        }),
      } as Response);
    vi.mocked(apiPost).mockImplementation(() => snoozeDeferred.promise);

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Snooze 10s' }));

    snoozeDeferred.resolve({
      ok: true,
      json: async () => ({
        finding: {
          id: 'finding-1',
          snoozedUntil: '2026-03-17T18:51:28.000Z',
          status: 'snoozed',
        },
      }),
    } as Response);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/no active proactive fleetgraph findings/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_250);
    });

    expect(apiGet).toHaveBeenCalledTimes(3);
    expect(await screen.findByText('Week start drift: Sprint 8')).toBeInTheDocument();
  });

  it('requires an inline review step before applying the start-week action', async () => {
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
            recommendedAction: {
              endpoint: {
                method: 'POST',
                path: `/api/weeks/${SPRINT_ID}/start`,
              },
              evidence: ['The week is still planning after the expected start date.'],
              rationale: 'Starting the week is the recommended next Ship action.',
              summary: 'Start Sprint 8 when the PM confirms the timing.',
              targetId: SPRINT_ID,
              targetType: 'sprint',
              title: 'Start Sprint 8',
              type: 'start_week',
            },
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
    vi.mocked(apiPost).mockImplementation(async (path) => {
      if (path === '/api/fleetgraph/findings/finding-1/review') {
        return {
          ok: true,
          json: async () => ({
            finding: {
              id: 'finding-1',
            },
            review: {
              cancelLabel: 'Cancel',
              confirmLabel: 'Start week in Ship',
              evidence: ['The week is still planning after the expected start date.'],
              summary: 'Nothing changes in Ship until you confirm this start-week action.',
              threadId: 'fleetgraph:workspace-1:finding-review:finding-1:start-week',
              title: 'Confirm before starting this week',
            },
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          finding: {
            actionExecution: {
              actionType: 'start_week',
              appliedAt: '2026-03-17T12:05:00.000Z',
              attemptCount: 1,
              endpoint: {
                method: 'POST',
                path: `/api/weeks/${SPRINT_ID}/start`,
              },
              findingId: 'finding-1',
              message: 'Week started successfully with 2 scoped issues.',
              status: 'applied',
              updatedAt: '2026-03-17T12:05:00.000Z',
            },
            id: 'finding-1',
          },
        }),
      } as Response;
    });

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fireEvent.click(await screen.findByRole('button', { name: 'Review and apply' }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/review');
    });
    expect(screen.getByText('Confirm before starting this week')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing changes in Ship until you confirm this start-week action.')
    ).toBeInTheDocument();

    now += 500;
    fireEvent.click(screen.getByRole('button', { name: 'Start week in Ship' }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/apply');
    });
  });

  it('does not apply from the same click gesture that opens review', async () => {
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
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
            recommendedAction: {
              endpoint: {
                method: 'POST',
                path: `/api/weeks/${SPRINT_ID}/start`,
              },
              evidence: ['The week is still planning after the expected start date.'],
              rationale: 'Starting the week is the recommended next Ship action.',
              summary: 'Start Sprint 8 when the PM confirms the timing.',
              targetId: SPRINT_ID,
              targetType: 'sprint',
              title: 'Start Sprint 8',
              type: 'start_week',
            },
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
    vi.mocked(apiPost).mockImplementation(async (path) => {
      if (path === '/api/fleetgraph/findings/finding-1/review') {
        return {
          ok: true,
          json: async () => ({
            finding: {
              id: 'finding-1',
            },
            review: {
              cancelLabel: 'Cancel',
              confirmLabel: 'Start week in Ship',
              evidence: ['The week is still planning after the expected start date.'],
              summary: 'Nothing changes in Ship until you confirm this start-week action.',
              threadId: 'fleetgraph:workspace-1:finding-review:finding-1:start-week',
              title: 'Confirm before starting this week',
            },
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          finding: {
            actionExecution: {
              actionType: 'start_week',
              appliedAt: '2026-03-17T12:05:00.000Z',
              attemptCount: 1,
              endpoint: {
                method: 'POST',
                path: `/api/weeks/${SPRINT_ID}/start`,
              },
              findingId: 'finding-1',
              message: 'Week started successfully with 2 scoped issues.',
              status: 'applied',
              updatedAt: '2026-03-17T12:05:00.000Z',
            },
            id: 'finding-1',
          },
        }),
      } as Response;
    });

    render(
      <FleetGraphFindingsPanel
        context={createContext()}
        currentDocumentId={DOCUMENT_ID}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Review and apply' }));
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/review');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start week in Ship' }));

    expect(apiPost).toHaveBeenCalledTimes(1);

    now += 500;
    fireEvent.click(screen.getByRole('button', { name: 'Start week in Ship' }));
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/apply');
    });
  });

  it('uses one suggested-next-step label and stronger review emphasis', async () => {
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
            recommendedAction: {
              endpoint: {
                method: 'POST',
                path: `/api/weeks/${SPRINT_ID}/start`,
              },
              evidence: ['The week is still planning after the expected start date.'],
              rationale: 'Starting the week is the recommended next Ship action.',
              summary: 'Start Sprint 8 when the PM confirms the timing.',
              targetId: SPRINT_ID,
              targetType: 'sprint',
              title: 'Start Sprint 8',
              type: 'start_week',
            },
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
        },
        review: {
          cancelLabel: 'Cancel',
          confirmLabel: 'Start week in Ship',
          evidence: ['The week is still planning after the expected start date.'],
          summary: 'Nothing changes in Ship until you confirm this start-week action.',
          threadId: 'fleetgraph:workspace-1:finding-review:finding-1:start-week',
          title: 'Confirm before starting this week',
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

    await screen.findByText('Week start drift: Sprint 8');

    expect(screen.getAllByText('Suggested next step')).toHaveLength(1);
    expect(screen.getByText('Start Sprint 8')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Review and apply' }));
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/findings/finding-1/review');
    });

    const reviewHeading = screen.getByText('Confirm before starting this week');
    expect(reviewHeading).toHaveClass('text-base');
    expect(reviewHeading).toHaveClass('font-semibold');
  });
});
