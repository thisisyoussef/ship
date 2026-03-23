import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
  }
})

vi.mock('@/hooks/useTeamMembersQuery', () => ({
  useAssignableMembersQuery: () => ({ data: [] }),
}))

import { apiGet } from '@/lib/api'
import { FleetGraphQueuePage } from './FleetGraphQueuePage'

function createWrapper(initialEntry = '/fleetgraph') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/fleetgraph" element={children} />
            <Route path="/documents/:id" element={<div>Document page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('FleetGraphQueuePage', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset()
  })

  it('loads workspace-wide findings without document ids and opens related documents from the queue', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      json: async () => ({
        findings: [
          {
            dedupeKey: 'dedupe-1',
            documentId: 'sprint-8',
            documentType: 'sprint',
            evidence: ['Sprint 8 still has no owner assigned.'],
            findingKey: 'sprint-no-owner:workspace-1:sprint-8',
            findingType: 'sprint_no_owner',
            id: 'finding-1',
            metadata: {},
            status: 'active',
            summary: 'Sprint 8 needs a named owner before work coordination slips.',
            threadId: 'fleetgraph:workspace-1:scheduled-sweep',
            title: 'Sprint owner gap: Sprint 8',
            updatedAt: '2026-03-22T04:00:00.000Z',
            workspaceId: 'workspace-1',
          },
          {
            dedupeKey: 'dedupe-2',
            documentId: 'sprint-9',
            documentType: 'sprint',
            evidence: ['Sprint 9 has 3 unassigned issues.'],
            findingKey: 'unassigned-issues:workspace-1:sprint-9',
            findingType: 'unassigned_sprint_issues',
            id: 'finding-2',
            metadata: {
              unassignedCount: 3,
            },
            status: 'active',
            summary: 'Sprint 9 still has unassigned issues.',
            threadId: 'fleetgraph:workspace-1:scheduled-sweep',
            title: '3 unassigned issues in Sprint 9',
            updatedAt: '2026-03-22T04:05:00.000Z',
            workspaceId: 'workspace-1',
          },
        ],
      }),
    } as Response)

    render(<FleetGraphQueuePage />, {
      wrapper: createWrapper(),
    })

    expect(await screen.findByText('Sprint owner gap: Sprint 8')).toBeInTheDocument()
    expect(screen.getByText('3 unassigned issues in Sprint 9')).toBeInTheDocument()
    expect(apiGet).toHaveBeenCalledWith('/api/fleetgraph/findings')

    fireEvent.click(screen.getAllByRole('button', { name: /open related document/i })[1]!)

    expect(await screen.findByText('Document page')).toBeInTheDocument()
  })
})
