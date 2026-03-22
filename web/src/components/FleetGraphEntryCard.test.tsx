import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
  }
})

import { apiGet, apiPost } from '@/lib/api'
import { FleetGraphEntryCard } from './FleetGraphEntryCard'

const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

function createContext(
  currentDocumentType: 'project' | 'sprint' | 'weekly_plan' = 'project',
  currentTitle = 'Launch planner'
) {
  return {
    ancestors: [],
    belongs_to: [
      {
        color: '#1d4ed8',
        document_type: 'project',
        id: '44444444-4444-4444-8444-444444444444',
        title: 'North Star',
        type: 'project' as const,
      },
    ],
    breadcrumbs: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        title: 'North Star',
        type: 'project',
      },
      {
        id: DOCUMENT_ID,
        title: currentTitle,
        type: currentDocumentType,
      },
    ],
    children: [],
    current: {
      document_type: currentDocumentType,
      id: DOCUMENT_ID,
      title: currentTitle,
    },
  }
}

describe('FleetGraphEntryCard', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset()
    vi.mocked(apiPost).mockReset()
  })

  it('posts the current Ship context without technical details in the main card', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      json: async () => ({
        analysis: {
          findings: [
            {
              actionTier: 'A',
              evidence: ['Launch planner still has no milestones scoped.'],
              findingType: 'risk',
              severity: 'warning',
              summary: 'The page still needs execution detail.',
              title: 'Planning detail is still thin',
            },
          ],
          text: 'Launch planner still needs milestones and ownership detail before execution.',
        },
        entry: {
          current: {
            documentType: 'project',
            id: DOCUMENT_ID,
            title: 'Launch planner',
          },
          route: {
            activeTab: 'details',
            nestedPath: ['milestones'],
            surface: 'document-page',
          },
          threadId: 'fleetgraph:workspace-1:document:project',
        },
        run: {
          outcome: 'advisory',
          path: ['reasoned'],
          routeSurface: 'document-page',
          threadId: 'fleetgraph:workspace-1:document:project',
        },
        summary: {
          detail: 'FleetGraph analyzed the current page context.',
          surfaceLabel: 'document-page / details',
          title: 'What matters on this page',
        },
      }),
    } as Response)

    render(
      <FleetGraphEntryCard
        activeTab="details"
        context={createContext()}
        document={{
          documentType: 'project',
          id: DOCUMENT_ID,
          title: 'Launch planner',
          workspaceId: '22222222-2222-4222-8222-222222222222',
        }}
        nestedPath="milestones"
        userId="11111111-1111-4111-8111-111111111111"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByRole('button', { name: /check this page/i }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/api/fleetgraph/entry',
        expect.objectContaining({
          route: {
            activeTab: 'details',
            nestedPath: ['milestones'],
            surface: 'document-page',
          },
          trigger: expect.objectContaining({
            documentId: DOCUMENT_ID,
            documentType: 'project',
            mode: 'on_demand',
            trigger: 'document-context',
          }),
        })
      )
    })

    expect(screen.getByText('What matters on this page')).toBeInTheDocument()
    expect(
      screen.getByText('Launch planner still needs milestones and ownership detail before execution.')
    ).toBeInTheDocument()
    expect(screen.getByText('Planning detail is still thin')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask a follow-up...')).toBeInTheDocument()
    expect(screen.queryByText('fleetgraph:workspace-1:document:project')).not.toBeInTheDocument()
    expect(screen.queryByText('document-page / details')).not.toBeInTheDocument()
  })

  it('hands off Check this page to the page-level FAB launcher when provided', async () => {
    const onCheckCurrentContext = vi.fn()

    render(
      <FleetGraphEntryCard
        activeTab="details"
        context={createContext()}
        document={{
          documentType: 'project',
          id: DOCUMENT_ID,
          title: 'Launch planner',
          workspaceId: '22222222-2222-4222-8222-222222222222',
        }}
        nestedPath="milestones"
        onCheckCurrentContext={onCheckCurrentContext}
        userId="11111111-1111-4111-8111-111111111111"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByRole('button', { name: /check this page/i }))

    expect(onCheckCurrentContext).toHaveBeenCalledWith(
      expect.objectContaining({
        activeTab: 'details',
        context: expect.objectContaining({
          current: expect.objectContaining({
            document_type: 'project',
            id: DOCUMENT_ID,
          }),
        }),
        document: expect.objectContaining({
          documentType: 'project',
          id: DOCUMENT_ID,
          title: 'Launch planner',
        }),
      })
    )
    expect(apiPost).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText('Ask a follow-up...')).not.toBeInTheDocument()
  })

  it('keeps page-analysis follow-up turns on the same FleetGraph entry thread', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: {
          content: [{ type: 'paragraph' }],
          type: 'doc',
        },
        is_draft: false,
        plan_validated: null,
        title: 'Week 8 Review',
      }),
    } as Response)
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
              id: DOCUMENT_ID,
              title: 'Sprint 8',
            },
            route: {
              activeTab: 'review',
              nestedPath: [],
              surface: 'document-page',
            },
            threadId: 'fleetgraph:workspace-1:entry-analysis:sprint-8',
          },
          run: {
            outcome: 'advisory',
            path: ['resolve_trigger_context', 'select_scenarios', 'run_scenario:on_demand_analysis'],
            routeSurface: 'document-page / review',
            threadId: 'fleetgraph:workspace-1:entry-analysis:sprint-8',
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
          path: ['resolve_trigger_context', 'select_scenarios', 'run_scenario:on_demand_analysis'],
          threadId: 'fleetgraph:workspace-1:entry-analysis:sprint-8',
        }),
      } as Response)

    render(
      <FleetGraphEntryCard
        activeTab="review"
        context={createContext('sprint', 'Sprint 8')}
        document={{
          documentType: 'sprint',
          id: DOCUMENT_ID,
          title: 'Sprint 8',
          workspaceId: '22222222-2222-4222-8222-222222222222',
        }}
        userId="11111111-1111-4111-8111-111111111111"
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /check this page/i })).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /check this page/i }))
    expect(await screen.findByText('Sprint 8 still has one planning gap.')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Ask a follow-up...'), {
      target: { value: 'What else should I look at?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenNthCalledWith(
        2,
        '/api/fleetgraph/thread/fleetgraph%3Aworkspace-1%3Aentry-analysis%3Asprint-8/turn',
        { message: 'What else should I look at?' }
      )
    })

    expect(await screen.findByText('You should also review the unassigned issue before closing the week.'))
      .toBeInTheDocument()
  })

  it('renders the approval gate when the backend marks the run as approval required', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      json: async () => ({
        approval: {
          endpoint: {
            method: 'POST',
            path: `/api/projects/${DOCUMENT_ID}/approve-plan`,
          },
          evidence: [
            'You are already on the project page, so you can review the plan in context.',
            'Approving it marks this plan as ready for the team to follow.',
          ],
          options: [
            { id: 'apply', label: 'Apply' },
            { id: 'dismiss', label: 'Dismiss' },
            { id: 'snooze', label: 'Snooze' },
          ],
          rationale: 'Approve this plan when it is ready to guide the project.',
          state: 'pending_confirmation',
          summary: 'Approve the current project plan.',
          targetId: DOCUMENT_ID,
          targetType: 'project',
          title: 'Approve project plan',
          type: 'approve_project_plan',
        },
        entry: {
          current: {
            documentType: 'project',
            id: DOCUMENT_ID,
            title: 'Launch planner',
          },
          route: {
            activeTab: 'details',
            nestedPath: ['milestones'],
            surface: 'document-page',
          },
          threadId: 'fleetgraph:workspace-1:document:project',
        },
        run: {
          outcome: 'approval_required',
          path: ['approval_required'],
          routeSurface: 'document-page',
          threadId: 'fleetgraph:workspace-1:document:project',
        },
        summary: {
          detail: 'Review the suggested next step for Launch planner.',
          surfaceLabel: 'document-page / details',
          title: 'FleetGraph paused for your confirmation.',
        },
      }),
    } as Response)

    render(
      <FleetGraphEntryCard
        activeTab="details"
        context={createContext()}
        document={{
          documentType: 'project',
          id: DOCUMENT_ID,
          title: 'Launch planner',
          workspaceId: '22222222-2222-4222-8222-222222222222',
        }}
        nestedPath="milestones"
        userId="11111111-1111-4111-8111-111111111111"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByRole('button', { name: /preview next step/i }))

    expect(await screen.findByText('Approve project plan')).toBeInTheDocument()
    expect(screen.getByText('FleetGraph paused for your confirmation.')).toBeInTheDocument()
    expect(screen.getByText('Approve the current project plan.')).toBeInTheDocument()
    expect(
      screen.getByText('Approve this plan when it is ready to guide the project.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('You are already on the project page, so you can review the plan in context.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Approving it marks this plan as ready for the team to follow.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Review the suggested next step for Launch planner.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Snooze' })).toBeInTheDocument()
    expect(screen.queryByText(`POST /api/projects/${DOCUMENT_ID}/approve-plan`)).not.toBeInTheDocument()
  })

  it('loads sprint review state and previews a validation step on the review tab', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: {
          content: [{ type: 'paragraph' }],
          type: 'doc',
        },
        is_draft: true,
        plan_validated: null,
        title: 'Week 8 Review',
      }),
    } as Response)
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      json: async () => ({
        approval: {
          body: {
            content: {
              content: [{ type: 'paragraph' }],
              type: 'doc',
            },
            plan_validated: true,
            title: 'Week 8 Review',
          },
          endpoint: {
            method: 'POST',
            path: `/api/weeks/${DOCUMENT_ID}/review`,
          },
          evidence: [
            'You are already on the week review, so the validation result is visible on this page.',
            'Marking the plan as validated updates Plan Validation to show Validated.',
          ],
          options: [
            { id: 'apply', label: 'Apply' },
            { id: 'dismiss', label: 'Dismiss' },
            { id: 'snooze', label: 'Snooze' },
          ],
          rationale: 'Validate the week plan when the review shows the plan held up in practice.',
          state: 'pending_confirmation',
          summary: 'Mark the current week plan as validated in the review.',
          targetId: DOCUMENT_ID,
          targetType: 'sprint',
          title: 'Validate week plan',
          type: 'validate_week_plan',
        },
        entry: {
          current: {
            documentType: 'sprint',
            id: DOCUMENT_ID,
            title: 'Sprint 8',
          },
          route: {
            activeTab: 'review',
            nestedPath: [],
            surface: 'document-page',
          },
          threadId: 'fleetgraph:workspace-1:document:sprint-review',
        },
        run: {
          outcome: 'approval_required',
          path: ['approval_required'],
          routeSurface: 'document-page',
          threadId: 'fleetgraph:workspace-1:document:sprint-review',
        },
        summary: {
          detail: 'Review the suggested next step for Sprint 8.',
          surfaceLabel: 'document-page / review',
          title: 'FleetGraph paused for your confirmation.',
        },
      }),
    } as Response)

    render(
      <FleetGraphEntryCard
        activeTab="review"
        context={createContext('sprint', 'Sprint 8')}
        document={{
          documentType: 'sprint',
          id: DOCUMENT_ID,
          title: 'Sprint 8',
          workspaceId: '22222222-2222-4222-8222-222222222222',
        }}
        userId="11111111-1111-4111-8111-111111111111"
      />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith(`/api/weeks/${DOCUMENT_ID}/review`)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /preview next step/i })).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /preview next step/i }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/api/fleetgraph/entry',
        expect.objectContaining({
          draft: expect.objectContaining({
            requestedAction: expect.objectContaining({
              body: expect.objectContaining({
                plan_validated: true,
                title: 'Week 8 Review',
              }),
              endpoint: expect.objectContaining({
                method: 'POST',
                path: `/api/weeks/${DOCUMENT_ID}/review`,
              }),
              type: 'validate_week_plan',
            }),
          }),
        })
      )
    })

    expect(await screen.findByText('Validate week plan')).toBeInTheDocument()
    expect(screen.getByText('FleetGraph paused for your confirmation.')).toBeInTheDocument()
    expect(screen.getByText('Review step')).toBeInTheDocument()
    expect(screen.getByText('Needs your confirmation')).toBeInTheDocument()
    expect(screen.getByText('Mark the current week plan as validated in the review.')).toBeInTheDocument()
    expect(
      screen.getByText('Validate the week plan when the review shows the plan held up in practice.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Marking the plan as validated updates Plan Validation to show Validated.')
    ).toBeInTheDocument()
  })

  it('applies entry approvals through FleetGraph and shows the result inline', async () => {
    vi.mocked(apiPost)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approval: {
            endpoint: {
              method: 'POST',
              path: `/api/projects/${DOCUMENT_ID}/approve-plan`,
            },
            evidence: [
              'You are already on the project page, so you can review the plan in context.',
              'Approving it marks this plan as ready for the team to follow.',
            ],
            options: [
              { id: 'apply', label: 'Apply' },
              { id: 'dismiss', label: 'Dismiss' },
              { id: 'snooze', label: 'Snooze' },
            ],
            rationale: 'Approve this plan when it is ready to guide the project.',
            state: 'pending_confirmation',
            summary: 'Approve the current project plan.',
            targetId: DOCUMENT_ID,
            targetType: 'project',
            title: 'Approve project plan',
            type: 'approve_project_plan',
          },
          entry: {
            current: {
              documentType: 'project',
              id: DOCUMENT_ID,
              title: 'Launch planner',
            },
            route: {
              activeTab: 'details',
              nestedPath: ['milestones'],
              surface: 'document-page',
            },
            threadId: 'fleetgraph:workspace-1:entry:project',
          },
          run: {
            outcome: 'approval_required',
            path: ['approval_required'],
            routeSurface: 'document-page',
            threadId: 'fleetgraph:workspace-1:entry:project',
          },
          summary: {
            detail: 'Review the suggested next step for Launch planner.',
            surfaceLabel: 'document-page / details',
            title: 'FleetGraph paused for your confirmation.',
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          actionOutcome: {
            message: 'Project plan approved in Ship.',
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
            threadId: 'fleetgraph:workspace-1:entry:project',
          },
          summary: {
            detail: 'Project plan approved in Ship.',
            surfaceLabel: 'document-page',
            title: 'FleetGraph completed the action.',
          },
        }),
      } as Response)

    render(
      <FleetGraphEntryCard
        activeTab="details"
        context={createContext()}
        document={{
          documentType: 'project',
          id: DOCUMENT_ID,
          title: 'Launch planner',
          workspaceId: '22222222-2222-4222-8222-222222222222',
        }}
        nestedPath="milestones"
        userId="11111111-1111-4111-8111-111111111111"
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByRole('button', { name: /preview next step/i }))
    expect(await screen.findByText('Approve project plan')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenNthCalledWith(
        2,
        '/api/fleetgraph/entry/apply',
        { threadId: 'fleetgraph:workspace-1:entry:project' }
      )
    })

    expect(screen.queryByText(`POST /api/projects/${DOCUMENT_ID}/approve-plan`)).not.toBeInTheDocument()
    const title = await screen.findByText('FleetGraph completed the action.')
    const detail = screen.getByText('Project plan approved in Ship.')

    expect(title).toBeInTheDocument()
    expect(detail).toBeInTheDocument()
    expect(title.className).toContain('text-emerald-950')
    expect(detail.className).toContain('text-emerald-900/85')
  })
})
