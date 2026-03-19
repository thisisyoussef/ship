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
        actionDrafts: [
          {
            actionId: 'start_week:week-1',
            actionType: 'start_week',
            contextHints: {
              findingFingerprint: 'finding-1',
            },
            evidence: ['The week is still planning after the expected start window.'],
            rationale: 'This week should be active by now.',
            targetId: 'week-1',
            targetType: 'sprint',
          },
        ],
        branch: 'action_required',
        path: ['resolve_trigger_context', 'reason_findings', 'approval_interrupt'],
        pendingApproval: null,
        reasonedFindings: [
          {
            evidence: ['The week is still planning after the expected start window.'],
            explanation: 'This week should be active by now.',
            findingType: 'week_start_drift',
            fingerprint: 'finding-1',
            severity: 'warning',
            targetEntity: {
              id: 'week-1',
              name: 'Week 1',
              type: 'sprint',
            },
            title: 'Week start drift',
          },
        ],
        responsePayload: {
          answer: {
            entityLinks: [],
            suggestedNextSteps: ['start_week'],
            text: 'Week needs to be started.',
          },
          type: 'chat_answer',
        },
        threadId: 'fleetgraph:workspace-1:analyze:project-1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        actionDraft: {
          actionId: 'start_week:week-1',
          actionType: 'start_week',
          evidence: ['The week is still planning after the expected start window.'],
          rationale: 'This week should be active by now.',
          targetId: 'week-1',
          targetType: 'sprint',
        },
        dialogSpec: {
          cancelLabel: 'Cancel',
          confirmLabel: 'Start week in Ship',
          evidence: ['The week is still planning after the expected start window.'],
          fields: [],
          kind: 'confirm',
          summary: 'FleetGraph thinks this week is ready to start. Nothing changes in Ship until you confirm.',
          title: 'Confirm before starting this week',
        },
        threadId: 'fleetgraph:workspace-1:analyze:project-1:action:start_week:week-1',
      }))

    renderAnalysisSection()

    expect(await screen.findByText('Week needs to be started.')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: 'Review week start' }))

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

  it('submits typed dialog values through FleetGraph and surfaces failures truthfully', async () => {
    vi.mocked(apiPost)
      .mockResolvedValueOnce(jsonResponse({
        actionDrafts: [
          {
            actionId: 'assign_owner:week-1',
            actionType: 'assign_owner',
            contextHints: {
              findingFingerprint: 'finding-2',
            },
            evidence: ['Week 1 has no owner assigned.'],
            rationale: 'Assign an accountable owner before execution.',
            targetId: 'week-1',
            targetType: 'sprint',
          },
        ],
        branch: 'action_required',
        path: ['resolve_trigger_context', 'reason_findings', 'approval_interrupt'],
        pendingApproval: null,
        reasonedFindings: [
          {
            evidence: ['Week 1 has no owner assigned.'],
            explanation: 'This week needs a directly accountable owner.',
            findingType: 'sprint_no_owner',
            fingerprint: 'finding-2',
            severity: 'warning',
            targetEntity: {
              id: 'week-1',
              name: 'Week 1',
              type: 'sprint',
            },
            title: 'Week needs an owner',
          },
        ],
        responsePayload: {
          answer: {
            entityLinks: [],
            suggestedNextSteps: ['assign_owner'],
            text: 'Week 1 needs an owner.',
          },
          type: 'chat_answer',
        },
        threadId: 'fleetgraph:workspace-1:analyze:project-1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        actionDraft: {
          actionId: 'assign_owner:week-1',
          actionType: 'assign_owner',
          evidence: ['Week 1 has no owner assigned.'],
          rationale: 'Assign an accountable owner before execution.',
          targetId: 'week-1',
          targetType: 'sprint',
        },
        dialogSpec: {
          cancelLabel: 'Cancel',
          confirmLabel: 'Assign owner',
          evidence: ['Week 1 has no owner assigned.'],
          fields: [
            {
              label: 'Owner',
              name: 'ownerId',
              options: [
                { label: 'Alice', value: 'person-1' },
                { label: 'Jordan', value: 'person-2' },
              ],
              placeholder: 'Choose an owner',
              required: true,
              type: 'single_select',
            },
          ],
          kind: 'single_select',
          summary: 'Choose the teammate who should own this week.',
          title: 'Assign an owner before continuing',
        },
        threadId: 'fleetgraph:workspace-1:analyze:project-1:action:assign_owner:week-1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        actionDraft: {
          actionId: 'assign_owner:week-1',
          actionType: 'assign_owner',
          evidence: ['Week 1 has no owner assigned.'],
          rationale: 'Assign an accountable owner before execution.',
          targetId: 'week-1',
          targetType: 'sprint',
        },
        actionResult: {
          endpoint: 'PATCH /api/documents/week-1',
          errorMessage: 'Ship rejected the owner assignment.',
          executedAt: '2026-03-19T10:00:00.000Z',
          method: 'PATCH',
          path: '/api/documents/week-1',
          statusCode: 409,
          success: false,
        },
        threadId: 'fleetgraph:workspace-1:analyze:project-1:action:assign_owner:week-1',
      }))

    renderAnalysisSection()

    fireEvent.click(await screen.findByRole('button', { name: 'Assign owner' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'person-2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Assign owner' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(await screen.findByText('Ship rejected the owner assignment.')).toBeInTheDocument()
    expect(vi.mocked(apiPost)).toHaveBeenNthCalledWith(
      3,
      '/api/fleetgraph/thread/fleetgraph%3Aworkspace-1%3Aanalyze%3Aproject-1/actions/assign_owner%3Aweek-1/apply',
      {
        values: {
          ownerId: 'person-2',
        },
      }
    )
    expect(vi.mocked(apiPost)).not.toHaveBeenCalledWith('/api/documents/week-1')
  })
})
