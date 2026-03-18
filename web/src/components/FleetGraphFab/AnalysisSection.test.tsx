import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    apiPost: vi.fn(),
  }
})

import { apiPost } from '@/lib/api'
import { AnalysisSection } from './AnalysisSection'

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response
}

function renderAnalysisSection() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <AnalysisSection
        documentId="project-1"
        documentTitle="Launch planner"
        documentType="project"
      />
    </QueryClientProvider>
  )
}

describe('AnalysisSection', () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    })
  })

  it('opens a server-backed confirm dialog for supported actions and cancels safely', async () => {
    vi.mocked(apiPost)
      .mockResolvedValueOnce(jsonResponse({
        analysisFindings: [
          {
            actionTier: 'C',
            evidence: ['The week is still planning after the expected start window.'],
            findingType: 'drift',
            proposedAction: {
              actionId: 'start_week:week-1',
              actionType: 'start_week',
              dialogKind: 'confirm',
              endpoint: {
                method: 'POST',
                path: '/api/weeks/week-1/start',
              },
              label: 'Review and apply',
              reviewSummary: 'FleetGraph thinks this week is ready to start. Nothing changes in Ship until you confirm.',
              reviewTitle: 'Confirm before starting this week',
              targetId: 'week-1',
              targetType: 'sprint',
            },
            severity: 'warning',
            summary: 'This week should be active by now.',
            title: 'Week start drift',
          },
        ],
        analysisText: 'Week needs to be started.',
        outcome: 'advisory',
        path: ['resolve_trigger_context', 'fetch_medium', 'reason', 'persist_result'],
        threadId: 'fleetgraph:workspace-1:analyze:project-1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        action: {
          actionId: 'start_week:week-1',
          actionType: 'start_week',
          dialogKind: 'confirm',
          endpoint: {
            method: 'POST',
            path: '/api/weeks/week-1/start',
          },
          evidence: ['The week is still planning after the expected start window.'],
          label: 'Review and apply',
          reviewSummary: 'FleetGraph thinks this week is ready to start. Nothing changes in Ship until you confirm.',
          reviewTitle: 'Confirm before starting this week',
          targetId: 'week-1',
          targetType: 'sprint',
        },
        review: {
          cancelLabel: 'Cancel',
          confirmLabel: 'Start week in Ship',
          evidence: ['The week is still planning after the expected start window.'],
          summary: 'FleetGraph thinks this week is ready to start. Nothing changes in Ship until you confirm.',
          threadId: 'fleetgraph:workspace-1:analyze:project-1:action:start_week:week-1',
          title: 'Confirm before starting this week',
        },
      }))

    renderAnalysisSection()

    expect(await screen.findByText('Week needs to be started.')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: 'Review and apply' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirm before starting this week')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(vi.mocked(apiPost)).toHaveBeenNthCalledWith(1, '/api/fleetgraph/analyze', {
      documentId: 'project-1',
      documentTitle: 'Launch planner',
      documentType: 'project',
    })
    expect(vi.mocked(apiPost)).toHaveBeenNthCalledWith(
      2,
      '/api/fleetgraph/thread/fleetgraph%3Aworkspace-1%3Aanalyze%3Aproject-1/actions/start_week%3Aweek-1/review'
    )
    expect(vi.mocked(apiPost)).toHaveBeenCalledTimes(2)
  })

  it('applies supported actions through FleetGraph and surfaces failures truthfully', async () => {
    vi.mocked(apiPost)
      .mockResolvedValueOnce(jsonResponse({
        analysisFindings: [
          {
            actionTier: 'B',
            evidence: ['Project plan is submitted and unapproved.'],
            findingType: 'risk',
            proposedAction: {
              actionId: 'approve_project_plan:project-1',
              actionType: 'approve_project_plan',
              dialogKind: 'confirm',
              endpoint: {
                method: 'POST',
                path: '/api/projects/project-1/approve-plan',
              },
              label: 'Review project approval',
              reviewSummary: 'FleetGraph is ready to approve this project plan. Nothing changes in Ship until you confirm.',
              reviewTitle: 'Confirm before approving this project plan',
              targetId: 'project-1',
              targetType: 'project',
            },
            severity: 'info',
            summary: 'The plan is ready for approval.',
            title: 'Project ready for approval',
          },
        ],
        analysisText: 'Project plan is ready for approval.',
        outcome: 'advisory',
        path: ['resolve_trigger_context', 'fetch_medium', 'reason', 'persist_result'],
        threadId: 'fleetgraph:workspace-1:analyze:project-1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        action: {
          actionId: 'approve_project_plan:project-1',
          actionType: 'approve_project_plan',
          dialogKind: 'confirm',
          endpoint: {
            method: 'POST',
            path: '/api/projects/project-1/approve-plan',
          },
          evidence: ['Project plan is submitted and unapproved.'],
          label: 'Review project approval',
          reviewSummary: 'FleetGraph is ready to approve this project plan. Nothing changes in Ship until you confirm.',
          reviewTitle: 'Confirm before approving this project plan',
          targetId: 'project-1',
          targetType: 'project',
        },
        review: {
          cancelLabel: 'Cancel',
          confirmLabel: 'Approve project plan',
          evidence: ['Project plan is submitted and unapproved.'],
          summary: 'FleetGraph is ready to approve this project plan. Nothing changes in Ship until you confirm.',
          threadId: 'fleetgraph:workspace-1:analyze:project-1:action:approve_project_plan:project-1',
          title: 'Confirm before approving this project plan',
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        action: {
          actionId: 'approve_project_plan:project-1',
          actionType: 'approve_project_plan',
          dialogKind: 'confirm',
          endpoint: {
            method: 'POST',
            path: '/api/projects/project-1/approve-plan',
          },
          evidence: ['Project plan is submitted and unapproved.'],
          label: 'Review project approval',
          reviewSummary: 'FleetGraph is ready to approve this project plan. Nothing changes in Ship until you confirm.',
          reviewTitle: 'Confirm before approving this project plan',
          targetId: 'project-1',
          targetType: 'project',
        },
        actionOutcome: {
          message: 'Project plan approved in Ship.',
          resultStatusCode: 200,
          status: 'applied',
        },
      }))

    renderAnalysisSection()

    fireEvent.click(await screen.findByRole('button', { name: 'Review project approval' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Approve project plan' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(await screen.findByText('Project plan approved in Ship.')).toBeInTheDocument()
    expect(vi.mocked(apiPost)).toHaveBeenNthCalledWith(
      3,
      '/api/fleetgraph/thread/fleetgraph%3Aworkspace-1%3Aanalyze%3Aproject-1/actions/approve_project_plan%3Aproject-1/apply'
    )
    expect(vi.mocked(apiPost)).not.toHaveBeenCalledWith('/api/projects/project-1/approve-plan')
  })
})
