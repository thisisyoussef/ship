import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useFleetGraphAnalysis', () => ({
  useFleetGraphAnalysis: vi.fn(),
}))

vi.mock('@/hooks/useFleetGraphEntry', () => ({
  useFleetGraphEntry: vi.fn(),
}))

import { useFleetGraphAnalysis } from '@/hooks/useFleetGraphAnalysis'
import { useFleetGraphEntry } from '@/hooks/useFleetGraphEntry'
import type { FleetGraphEntryInput } from '@/lib/fleetgraph-entry'
import { FleetGraphFab } from './FleetGraphFab'

const GUIDED_ENTRY: FleetGraphEntryInput = {
  activeTab: 'review',
  context: {
    ancestors: [],
    belongs_to: [],
    breadcrumbs: [
      {
        id: 'doc-123',
        title: 'Sprint 8',
        type: 'sprint',
      },
    ],
    children: [],
    current: {
      document_type: 'sprint',
      id: 'doc-123',
      title: 'Sprint 8',
    },
  },
  document: {
    documentType: 'sprint',
    id: 'doc-123',
    title: 'Sprint 8',
    workspaceId: 'workspace-1',
  },
  userId: 'user-1',
}

describe('FleetGraphFab', () => {
  beforeEach(() => {
    vi.mocked(useFleetGraphAnalysis).mockReset()
    vi.mocked(useFleetGraphEntry).mockReset()

    vi.mocked(useFleetGraphAnalysis).mockReturnValue({
      analyze: vi.fn(),
      applyError: null,
      applyFindingAction: vi.fn(),
      conversation: [
        {
          content: 'The sprint document needs more detail before review.',
          findings: [
            {
              actionTier: 'B',
              evidence: ['The sprint document is still empty.'],
              findingType: 'risk',
              proposedAction: {
                endpoint: {
                  method: 'POST',
                  path: '/api/documents/doc-123/comments',
                },
                label: 'Add content to the sprint document',
                targetId: 'doc-123',
                targetType: 'sprint',
              },
              severity: 'critical',
              summary: 'The document is missing the content needed for review.',
              title: 'Lack of Content in Sprint Document',
            },
          ],
          role: 'assistant',
          timestamp: '2026-03-22T00:00:00.000Z',
        },
      ],
      isAnalyzing: false,
      isApplying: false,
      isResponding: false,
      pendingActionFindingId: null,
      reset: vi.fn(),
      sendMessage: vi.fn(),
      threadId: 'fleetgraph:thread-1',
    })

    vi.mocked(useFleetGraphEntry).mockReturnValue({
      actionResult: null,
      analysisConversation: [],
      analysisThreadId: null,
      applyApproval: vi.fn(),
      checkCurrentContext: vi.fn(),
      dismissApproval: vi.fn(),
      errorMessage: null,
      isApplying: false,
      isLoading: false,
      isResponding: false,
      previewApproval: vi.fn(),
      reset: vi.fn(),
      result: undefined,
      sendAnalysisFollowUp: vi.fn(),
      snoozeApproval: vi.fn(),
    })
  })

  it('renders suggested next steps as plain text instead of clickable buttons', () => {
    render(
      <FleetGraphFab
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
        guidedActionsDisabled={false}
        guidedEntry={GUIDED_ENTRY}
        guidedHelperText="FleetGraph can suggest the next step from this page."
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /fleetgraph intelligence/i }))

    expect(screen.getByText('Suggested next step')).toBeInTheDocument()
    expect(screen.getByText('Add content to the sprint document')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /add content to the sprint document/i })
    ).not.toBeInTheDocument()
  })

  it('uses a dark text style for the follow-up input on the white chat surface', () => {
    render(
      <FleetGraphFab
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
        guidedActionsDisabled={false}
        guidedEntry={GUIDED_ENTRY}
        guidedHelperText="FleetGraph can suggest the next step from this page."
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /fleetgraph intelligence/i }))

    expect(screen.getByPlaceholderText('Ask a follow-up...')).toHaveClass('text-black')
  })

  it('opens and starts analysis when the page requests a handoff run', () => {
    const analyze = vi.fn()
    const reset = vi.fn()
    vi.mocked(useFleetGraphAnalysis).mockReturnValue({
      analyze,
      applyError: null,
      applyFindingAction: vi.fn(),
      conversation: [],
      isAnalyzing: false,
      isApplying: false,
      isResponding: false,
      pendingActionFindingId: null,
      reset,
      sendMessage: vi.fn(),
      threadId: null,
    })

    const { rerender } = render(
      <FleetGraphFab
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
        guidedActionsDisabled={false}
        guidedEntry={GUIDED_ENTRY}
        guidedHelperText="FleetGraph can suggest the next step from this page."
        launchRequestKey={0}
      />
    )

    expect(screen.queryByPlaceholderText('Ask a follow-up...')).not.toBeInTheDocument()

    rerender(
      <FleetGraphFab
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
        guidedActionsDisabled={false}
        guidedEntry={GUIDED_ENTRY}
        guidedHelperText="FleetGraph can suggest the next step from this page."
        launchRequestKey={1}
      />
    )

    expect(reset).toHaveBeenCalled()
    expect(analyze).toHaveBeenCalledWith('doc-123', 'sprint', 'Sprint 8')
    expect(screen.getByPlaceholderText('Ask a follow-up...')).toBeInTheDocument()
  })

  it('hosts the Preview next step launcher inside the guided-actions panel', () => {
    const previewApproval = vi.fn()
    vi.mocked(useFleetGraphEntry).mockReturnValue({
      actionResult: null,
      analysisConversation: [],
      analysisThreadId: null,
      applyApproval: vi.fn(),
      checkCurrentContext: vi.fn(),
      dismissApproval: vi.fn(),
      errorMessage: null,
      isApplying: false,
      isLoading: false,
      isResponding: false,
      previewApproval,
      reset: vi.fn(),
      result: undefined,
      sendAnalysisFollowUp: vi.fn(),
      snoozeApproval: vi.fn(),
    })

    render(
      <FleetGraphFab
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
        guidedActionsDisabled={false}
        guidedEntry={GUIDED_ENTRY}
        guidedHelperText="FleetGraph can suggest the next step from this page."
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /fleetgraph intelligence/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Guided actions' }))

    expect(screen.getByText('Preview the next step')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Preview next step' }))

    expect(previewApproval).toHaveBeenCalledWith(GUIDED_ENTRY)
  })

  it('preserves the review-and-apply flow inside the guided-actions panel', () => {
    vi.mocked(useFleetGraphEntry).mockReturnValue({
      actionResult: null,
      analysisConversation: [],
      analysisThreadId: null,
      applyApproval: vi.fn(),
      checkCurrentContext: vi.fn(),
      dismissApproval: vi.fn(),
      errorMessage: null,
      isApplying: false,
      isLoading: false,
      isResponding: false,
      previewApproval: vi.fn(),
      reset: vi.fn(),
      result: {
        approval: {
          endpoint: {
            method: 'PATCH',
            path: '/api/weeks/doc-123/review',
          },
          evidence: [
            'You are already on the week review, so the validation result is visible on this page.',
          ],
          options: [
            { id: 'apply', label: 'Apply' },
            { id: 'dismiss', label: 'Dismiss' },
            { id: 'snooze', label: 'Snooze' },
          ],
          rationale: 'Validate the week plan when the review shows the plan held up in practice.',
          state: 'pending_confirmation',
          summary: 'Mark the current week plan as validated in the review.',
          targetId: 'doc-123',
          targetType: 'sprint',
          title: 'Validate week plan',
          type: 'validate_week_plan',
        },
        entry: {
          current: {
            documentType: 'sprint',
            id: 'doc-123',
            title: 'Sprint 8',
          },
          route: {
            activeTab: 'review',
            nestedPath: [],
            surface: 'document-page',
          },
          threadId: 'fleetgraph:thread-1',
        },
        run: {
          branch: 'approval_required',
          outcome: 'approval_required',
          path: ['resolve_trigger_context', 'approval_interrupt'],
          routeSurface: 'document-page / review',
          threadId: 'fleetgraph:thread-1',
        },
        summary: {
          detail: 'Review the suggested next step for Sprint 8.',
          surfaceLabel: 'document-page / review',
          title: 'FleetGraph paused for your confirmation.',
        },
      },
      sendAnalysisFollowUp: vi.fn(),
      snoozeApproval: vi.fn(),
    })

    render(
      <FleetGraphFab
        activeTab="review"
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
        guidedActionsDisabled={false}
        guidedEntry={GUIDED_ENTRY}
        guidedHelperText="FleetGraph can suggest the next step from this page."
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /fleetgraph intelligence/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Guided actions' }))

    expect(screen.getByText('FleetGraph paused for your confirmation.')).toBeInTheDocument()
    expect(screen.getByText('Validate week plan')).toBeInTheDocument()
    expect(screen.getByText('Needs your confirmation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
  })
})
