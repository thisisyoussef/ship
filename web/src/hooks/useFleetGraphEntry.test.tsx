import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    apiPost: vi.fn(),
  }
})

import { apiPost } from '@/lib/api'
import type { FleetGraphApprovalEnvelope } from '@/lib/fleetgraph-entry'
import { documentContextKeys } from './useDocumentContextQuery'
import { documentKeys } from './useDocumentsQuery'
import { useFleetGraphEntry } from './useFleetGraphEntry'
import { sprintKeys } from './useWeeksQuery'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useFleetGraphEntry', () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset()
  })

  it('invalidates the current page and target sprint surfaces after apply', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      json: async () => ({
        actionOutcome: {
          message: 'Week plan approved in Ship.',
          resultStatusCode: 200,
          status: 'applied',
        },
        run: {
          branch: 'approval_required',
          outcome: 'approval_required',
          path: [
            'resolve_trigger_context',
            'approval_interrupt',
            'execute_action',
            'persist_action_outcome',
          ],
          routeSurface: 'document-page',
          threadId: 'fleetgraph:workspace-1:entry:weekly-plan',
        },
        summary: {
          detail: 'Week plan approved in Ship.',
          surfaceLabel: 'document-page',
          title: 'FleetGraph completed the action.',
        },
      }),
    } as Response)

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useFleetGraphEntry(), {
      wrapper: createWrapper(queryClient),
    })

    const approval: FleetGraphApprovalEnvelope = {
      endpoint: {
        method: 'POST',
        path: '/api/weeks/sprint-1/approve-plan',
      },
      evidence: ['The team is ready to move forward with this week.'],
      options: [
        { id: 'apply', label: 'Apply' },
        { id: 'dismiss', label: 'Dismiss' },
        { id: 'snooze', label: 'Snooze' },
      ],
      rationale: 'Approve this week plan when the team is ready to move forward.',
      state: 'pending_confirmation',
      summary: 'Approve the current week plan.',
      targetId: 'sprint-1',
      targetType: 'sprint',
      title: 'Approve week plan',
      type: 'approve_week_plan',
    }

    await act(async () => {
      result.current.applyApproval(
        'fleetgraph:workspace-1:entry:weekly-plan',
        approval,
        'weekly-plan-1'
      )
    })

    await waitFor(() => {
      expect(result.current.actionResult?.summary.title).toBe('FleetGraph completed the action.')
    })

    expect(apiPost).toHaveBeenCalledWith('/api/fleetgraph/entry/apply', {
      threadId: 'fleetgraph:workspace-1:entry:weekly-plan',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sprintKeys.lists() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sprintKeys.active() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sprintKeys.detail('sprint-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['document', 'sprint-1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: documentKeys.detail('sprint-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: documentContextKeys.detail('sprint-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['document', 'weekly-plan-1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: documentKeys.detail('weekly-plan-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: documentContextKeys.detail('weekly-plan-1') })
  })
})
