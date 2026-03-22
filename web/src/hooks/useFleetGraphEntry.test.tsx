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

  it('invalidates the current page, target sprint surfaces, and dispatches a refresh event after apply', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      json: async () => ({
        actionOutcome: {
          message: 'Week plan marked as validated in Ship.',
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
          detail: 'Week plan marked as validated in Ship.',
          surfaceLabel: 'document-page',
          title: 'Week plan validated.',
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
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const { result } = renderHook(() => useFleetGraphEntry(), {
      wrapper: createWrapper(queryClient),
    })

    const approval: FleetGraphApprovalEnvelope = {
      body: {
        plan_validated: true,
      },
      endpoint: {
        method: 'PATCH',
        path: '/api/weeks/sprint-1/review',
      },
      evidence: ['Marking the plan as validated updates Plan Validation to show Validated.'],
      options: [
        { id: 'apply', label: 'Apply' },
        { id: 'dismiss', label: 'Dismiss' },
        { id: 'snooze', label: 'Snooze' },
      ],
      rationale: 'Validate the week plan when the review shows the plan held up in practice.',
      state: 'pending_confirmation',
      summary: 'Mark the current week plan as validated in the review.',
      targetId: 'sprint-1',
      targetType: 'sprint',
      title: 'Validate week plan',
      type: 'validate_week_plan',
    }

    await act(async () => {
      result.current.applyApproval(
        'fleetgraph:workspace-1:entry:weekly-plan',
        approval,
        'weekly-plan-1'
      )
    })

    await waitFor(() => {
      expect(result.current.actionResult?.summary.title).toBe('Week plan validated.')
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
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({
        actionType: 'validate_week_plan',
        targetId: 'sprint-1',
      }),
      type: 'fleetgraph:entry-action-applied',
    }))
  })

  it('starts a fresh page-analysis thread and reuses it for follow-up turns', async () => {
    vi.mocked(apiPost)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analysis: {
            findings: [],
            text: 'Sprint 8 still has one planning gap.',
          },
          entry: {
            current: {
              documentType: 'sprint',
              id: 'sprint-1',
              title: 'Sprint 8',
            },
            route: {
              activeTab: 'review',
              nestedPath: [],
              surface: 'document-page',
            },
            threadId: 'fleetgraph:workspace-1:entry-analysis:sprint-1:session-1',
          },
          run: {
            branch: 'reasoned',
            outcome: 'advisory',
            path: [
              'resolve_trigger_context',
              'select_scenarios',
              'run_scenario:on_demand_analysis',
              'merge_candidates',
              'score_and_rank',
              'persist_result',
            ],
            routeSurface: 'document-page / review',
            threadId: 'fleetgraph:workspace-1:entry-analysis:sprint-1:session-1',
          },
          summary: {
            detail: 'FleetGraph analyzed the current page context.',
            surfaceLabel: 'document-page / review',
            title: 'What matters on this page',
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analysisFindings: [],
          analysisText: 'You should also review the unassigned issue before closing the week.',
          outcome: 'advisory',
          path: [
            'resolve_trigger_context',
            'select_scenarios',
            'run_scenario:on_demand_analysis',
            'merge_candidates',
            'score_and_rank',
            'persist_result',
          ],
          threadId: 'fleetgraph:workspace-1:entry-analysis:sprint-1:session-1',
        }),
      } as Response)

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const { result } = renderHook(() => useFleetGraphEntry(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      result.current.checkCurrentContext({
        activeTab: 'review',
        context: {
          ancestors: [],
          belongs_to: [],
          breadcrumbs: [
            {
              id: 'sprint-1',
              title: 'Sprint 8',
              type: 'sprint',
            },
          ],
          children: [],
          current: {
            document_type: 'sprint',
            id: 'sprint-1',
            title: 'Sprint 8',
          },
        },
        document: {
          documentType: 'sprint',
          id: 'sprint-1',
          title: 'Sprint 8',
          workspaceId: 'workspace-1',
        },
        userId: 'user-1',
      })
    })

    await waitFor(() => {
      expect(result.current.analysisConversation[0]?.content).toBe('Sprint 8 still has one planning gap.')
    })

    expect(apiPost).toHaveBeenNthCalledWith(
      1,
      '/api/fleetgraph/entry',
      expect.objectContaining({
        trigger: expect.objectContaining({
          threadId: expect.stringContaining('fleetgraph:workspace-1:entry-analysis:sprint-1'),
        }),
      })
    )

    await act(async () => {
      result.current.sendAnalysisFollowUp('What else should I look at?')
    })

    await waitFor(() => {
      expect(result.current.analysisConversation.at(-1)?.content)
        .toBe('You should also review the unassigned issue before closing the week.')
    })

    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      '/api/fleetgraph/thread/fleetgraph%3Aworkspace-1%3Aentry-analysis%3Asprint-1%3Asession-1/turn',
      { message: 'What else should I look at?' }
    )
  })
})
