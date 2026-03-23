import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FleetGraphDebugSurfaceProvider } from '@/components/FleetGraphDebugSurface'
import { useFleetGraphEntry } from '@/hooks/useFleetGraphEntry'
import {
  buildFleetGraphRequestedActions,
  type FleetGraphEntryInput,
  type FleetGraphRequestedActionDraft,
} from '@/lib/fleetgraph-entry'
import { FleetGraphGuidedActionsOverlay } from './FleetGraphGuidedActionsOverlay'

vi.mock('@/hooks/useFleetGraphEntry', () => ({
  useFleetGraphEntry: vi.fn(),
}))

vi.mock('@/lib/fleetgraph-entry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/fleetgraph-entry')>(
    '@/lib/fleetgraph-entry'
  )

  return {
    ...actual,
    buildFleetGraphRequestedActions: vi.fn(),
  }
})

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

const VALIDATE_ACTION: FleetGraphRequestedActionDraft = {
  body: {
    plan_validated: true,
  },
  endpoint: {
    method: 'PATCH',
    path: '/api/weeks/doc-123/review',
  },
  evidence: ['The review tab already has the validation context.'],
  rationale: 'Validate the week plan once the review looks correct.',
  summary: 'Mark the current week plan as validated in the review.',
  targetId: 'doc-123',
  targetType: 'sprint',
  title: 'Validate week plan',
  type: 'validate_week_plan',
}

const APPROVE_ACTION: FleetGraphRequestedActionDraft = {
  endpoint: {
    method: 'POST',
    path: '/api/weeks/doc-123/approve-plan',
  },
  evidence: ['The sprint still needs explicit plan approval.'],
  rationale: 'Approve the week plan before the team moves forward with it.',
  summary: 'Approve the current week plan.',
  targetId: 'doc-123',
  targetType: 'sprint',
  title: 'Approve week plan',
  type: 'approve_week_plan',
}

function renderOverlay(
  props?: Partial<{
    entry: FleetGraphEntryInput | null
    helperText: string
    isActionDisabled: boolean
    nestedPath?: string
  }>
) {
  return render(
    <FleetGraphDebugSurfaceProvider>
      <FleetGraphGuidedActionsOverlay
        entry={props?.entry ?? GUIDED_ENTRY}
        helperText={props?.helperText ?? 'FleetGraph can review the page you are on and suggest the next step.'}
        isActionDisabled={props?.isActionDisabled ?? false}
        nestedPath={props?.nestedPath}
      />
    </FleetGraphDebugSurfaceProvider>
  )
}

describe('FleetGraphGuidedActionsOverlay', () => {
  beforeEach(() => {
    vi.mocked(useFleetGraphEntry).mockReset()
    vi.mocked(buildFleetGraphRequestedActions).mockReset()
    vi.mocked(buildFleetGraphRequestedActions).mockReturnValue([VALIDATE_ACTION])
  })

  it('auto-previews once for a fresh page context and opens when FleetGraph has a next step', () => {
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
      result: {
        approval: {
          endpoint: {
            method: 'PATCH',
            path: '/api/weeks/doc-123/review',
          },
          evidence: ['The review tab already has the validation context.'],
          options: [
            { id: 'apply', label: 'Apply' },
            { id: 'dismiss', label: 'Dismiss' },
            { id: 'snooze', label: 'Snooze' },
          ],
          rationale: 'Validate the week plan once the review looks correct.',
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

    const { rerender } = renderOverlay()

    expect(previewApproval).toHaveBeenCalledWith(GUIDED_ENTRY, VALIDATE_ACTION)
    expect(
      screen.getByRole('dialog', { name: /fleetgraph guided actions/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: /fleetgraph guided actions/i })
    ).toHaveStyle({
      left: 'calc(var(--ship-main-left-offset, 3rem) + 1.5rem)',
    })
    expect(screen.getAllByText('Validate week plan')).toHaveLength(2)

    rerender(
      <FleetGraphDebugSurfaceProvider>
        <FleetGraphGuidedActionsOverlay
          entry={GUIDED_ENTRY}
          helperText="FleetGraph can review the page you are on and suggest the next step."
          isActionDisabled={false}
        />
      </FleetGraphDebugSurfaceProvider>
    )

    expect(previewApproval).toHaveBeenCalledTimes(1)
  })

  it('renders one card per guided candidate when the page has multiple next steps', () => {
    const firstPreviewApproval = vi.fn()
    const secondPreviewApproval = vi.fn()

    vi.mocked(buildFleetGraphRequestedActions).mockReturnValue([
      VALIDATE_ACTION,
      APPROVE_ACTION,
    ])

    vi.mocked(useFleetGraphEntry)
      .mockReturnValueOnce({
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
        previewApproval: firstPreviewApproval,
        reset: vi.fn(),
        result: {
          approval: {
            ...VALIDATE_ACTION,
            options: [
              { id: 'apply', label: 'Apply' },
              { id: 'dismiss', label: 'Dismiss' },
              { id: 'snooze', label: 'Snooze' },
            ],
            state: 'pending_confirmation',
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
      .mockReturnValueOnce({
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
        previewApproval: secondPreviewApproval,
        reset: vi.fn(),
        result: {
          approval: {
            ...APPROVE_ACTION,
            options: [
              { id: 'apply', label: 'Apply' },
              { id: 'dismiss', label: 'Dismiss' },
              { id: 'snooze', label: 'Snooze' },
            ],
            state: 'pending_confirmation',
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
            threadId: 'fleetgraph:thread-2',
          },
          run: {
            branch: 'approval_required',
            outcome: 'approval_required',
            path: ['resolve_trigger_context', 'approval_interrupt'],
            routeSurface: 'document-page / review',
            threadId: 'fleetgraph:thread-2',
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

    renderOverlay()

    expect(firstPreviewApproval).toHaveBeenCalledWith(GUIDED_ENTRY, VALIDATE_ACTION)
    expect(secondPreviewApproval).toHaveBeenCalledWith(GUIDED_ENTRY, APPROVE_ACTION)
    expect(screen.getByText('FleetGraph found 2 guided next steps')).toBeInTheDocument()
    expect(screen.getAllByText('Approve week plan')).toHaveLength(2)
    expect(screen.getAllByText('Validate week plan')).toHaveLength(2)
  })

  it('stays hidden when the page has no guided actions to surface', () => {
    const previewApproval = vi.fn()

    vi.mocked(buildFleetGraphRequestedActions).mockReturnValue([])
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
      result: {
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
          threadId: 'fleetgraph:thread-2',
        },
        run: {
          branch: 'quiet',
          outcome: 'quiet',
          path: ['resolve_trigger_context', 'quiet_exit'],
          routeSurface: 'document-page / review',
          threadId: 'fleetgraph:thread-2',
        },
        summary: {
          detail: 'No guided step is needed.',
          surfaceLabel: 'document-page / review',
          title: 'FleetGraph is quiet.',
        },
      },
      sendAnalysisFollowUp: vi.fn(),
      snoozeApproval: vi.fn(),
    })

    renderOverlay()

    expect(screen.queryByRole('dialog', { name: /fleetgraph guided actions/i })).not.toBeInTheDocument()
    expect(previewApproval).not.toHaveBeenCalled()
  })
})
