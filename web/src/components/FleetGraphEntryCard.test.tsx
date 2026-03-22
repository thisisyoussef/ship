import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    apiPost: vi.fn(),
  }
})

import { apiPost } from '@/lib/api'
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

function createContext() {
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
        title: 'Launch planner',
        type: 'project',
      },
    ],
    children: [],
    current: {
      document_type: 'project',
      id: DOCUMENT_ID,
      title: 'Launch planner',
    },
  }
}

describe('FleetGraphEntryCard', () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset()
  })

  it('posts the current Ship context without technical details in the main card', async () => {
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      json: async () => ({
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
          detail: 'FleetGraph can help with this page right now.',
          surfaceLabel: 'document-page / details',
          title: 'FleetGraph is ready in this project context.',
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

    expect(screen.getByText('FleetGraph is ready in this project context.'))
      .toBeInTheDocument()
    expect(screen.queryByText('fleetgraph:workspace-1:document:project')).not.toBeInTheDocument()
    expect(screen.queryByText('document-page / details')).not.toBeInTheDocument()
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
          title: 'FleetGraph paused for human approval.',
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

    fireEvent.click(screen.getByRole('button', { name: /preview approval step/i }))

    expect(await screen.findByText('Approve project plan')).toBeInTheDocument()
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
            title: 'FleetGraph paused for human approval.',
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

    fireEvent.click(screen.getByRole('button', { name: /preview approval step/i }))
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
    expect(await screen.findByText('FleetGraph completed the action.')).toBeInTheDocument()
    expect(screen.getByText('Project plan approved in Ship.')).toBeInTheDocument()
  })
})
