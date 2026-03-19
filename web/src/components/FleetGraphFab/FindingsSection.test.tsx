import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FindingsSection } from './FindingsSection'

vi.mock('@/hooks/useFleetGraphFindings', () => ({
  useFleetGraphFindings: vi.fn(),
}))

import { useFleetGraphFindings } from '@/hooks/useFleetGraphFindings'

const baseFinding = {
  dedupeKey: 'week-start-drift',
  documentId: 'week-1',
  documentType: 'sprint',
  evidence: [
    'hoursSinceStart: 94.53956333333333',
    'sprintStartDate: 2026-03-16T00:00:00.000Z',
    'status: planning',
    'entityTitle: FleetGraph Demo Week - Worker Generated',
  ],
  findingKey: 'week-start-drift:workspace-1:week-1',
  findingType: 'week_start_drift',
  id: 'finding-1',
  metadata: {},
  recommendedAction: {
    endpoint: {
      method: 'POST' as const,
      path: '/api/weeks/week-1/start',
    },
    evidence: ['Week should be active by now.'],
    rationale: 'This week should be active by now.',
    summary: 'Start the week so the team can track work.',
    targetId: 'week-1',
    targetType: 'sprint' as const,
    title: 'Start this week',
    type: 'start_week' as const,
  },
  status: 'active' as const,
  summary: 'This week should be underway by now, but it is still marked as planning.',
  threadId: 'fleetgraph:workspace-1:scheduled-sweep:week-1',
  title: 'Week start drift',
  updatedAt: '2026-03-19T10:00:00.000Z',
  workspaceId: 'workspace-1',
}

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    actionErrorMessage: null,
    applyFinding: vi.fn(),
    dismissFinding: vi.fn(),
    findings: [baseFinding],
    isLoading: false,
    isMutating: false,
    loadErrorMessage: null,
    refetchFindings: vi.fn(async () => ({ data: { findings: [] } })),
    resetActionState: vi.fn(),
    reviewFinding: vi.fn(async () => ({
      finding: baseFinding,
      review: {
        cancelLabel: 'Cancel',
        confirmLabel: 'Start week',
        evidence: baseFinding.evidence,
        summary: 'This week has passed its planned start, but Ship still lists it as Planning.',
        threadId: 'fleetgraph:workspace-1:scheduled-sweep:week-1:action:start_week:week-1',
        title: 'Start this week in Ship?',
      },
    })),
    snoozeFinding: vi.fn(),
    ...overrides,
  }
}

async function waitForReviewGuard() {
  await act(async () => {
    vi.advanceTimersByTime(500)
  })
}

async function flushAsyncState() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('FindingsSection', () => {
  beforeEach(() => {
    vi.mocked(useFleetGraphFindings).mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders proactive evidence with friendly facts instead of raw machine keys', () => {
    vi.mocked(useFleetGraphFindings).mockReturnValue(makeHookResult() as never)

    render(
      <FindingsSection
        currentDocumentId="week-1"
        onOpenAnalyze={vi.fn()}
      />
    )

    expect(screen.getByText('Time since planned start')).toBeInTheDocument()
    expect(screen.getByText('3 days, 23 hours')).toBeInTheDocument()
    expect(screen.getByText('Scheduled start')).toBeInTheDocument()
    expect(screen.getByText('Current Ship status')).toBeInTheDocument()
    expect(screen.getByText('Week name')).toBeInTheDocument()
    expect(screen.queryByText('hoursSinceStart: 94.53956333333333')).not.toBeInTheDocument()
  })

  it('retires a successfully applied finding, shows a receipt, and offers the next analysis step', async () => {
    const onOpenAnalyze = vi.fn()
    const applyFinding = vi.fn(async () => ({
      finding: {
        ...baseFinding,
        actionExecution: {
          actionType: 'start_week' as const,
          attemptCount: 1,
          endpoint: {
            method: 'POST' as const,
            path: '/api/weeks/week-1/start',
          },
          findingId: baseFinding.id,
          message: 'The week is now active in Ship with 3 scoped issues ready to track.',
          resultStatusCode: 200,
          status: 'applied' as const,
          updatedAt: '2026-03-19T10:05:00.000Z',
        },
        status: 'resolved' as const,
      },
    }))
    vi.mocked(useFleetGraphFindings).mockReturnValue(makeHookResult({
      applyFinding,
    }) as never)

    render(
      <FindingsSection
        currentDocumentId="week-1"
        onOpenAnalyze={onOpenAnalyze}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Review week start' }))
    await flushAsyncState()
    await waitForReviewGuard()
    const confirmButton = screen.getByRole('button', { name: 'Start week' })
    await act(async () => {
      fireEvent.click(confirmButton)
    })
    await flushAsyncState()

    expect(screen.getByText('The week is now active in Ship with 3 scoped issues ready to track.')).toBeInTheDocument()
    expect(screen.queryByText('Week start drift')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: "Analyze what's next" }))

    expect(onOpenAnalyze).toHaveBeenCalledTimes(1)
  })

  it('restores the finding if the same finding key comes back active on refetch', async () => {
    const applyFinding = vi.fn(async () => ({
      finding: {
        ...baseFinding,
        actionExecution: {
          actionType: 'start_week' as const,
          attemptCount: 1,
          endpoint: {
            method: 'POST' as const,
            path: '/api/weeks/week-1/start',
          },
          findingId: baseFinding.id,
          message: 'The week is now active in Ship.',
          resultStatusCode: 200,
          status: 'applied' as const,
          updatedAt: '2026-03-19T10:05:00.000Z',
        },
        status: 'resolved' as const,
      },
    }))
    const refetchFindings = vi.fn(async () => ({
      data: {
        findings: [baseFinding],
      },
    }))

    vi.mocked(useFleetGraphFindings).mockReturnValue(makeHookResult({
      applyFinding,
      refetchFindings,
    }) as never)

    render(
      <FindingsSection
        currentDocumentId="week-1"
        onOpenAnalyze={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Review week start' }))
    await flushAsyncState()
    await waitForReviewGuard()
    const confirmButton = screen.getByRole('button', { name: 'Start week' })
    await act(async () => {
      fireEvent.click(confirmButton)
    })
    await flushAsyncState()

    expect(screen.getByText('FleetGraph could not confirm that Ship changed. This finding is still active.')).toBeInTheDocument()
    expect(screen.getByText('Week start drift')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "Analyze what's next" })).not.toBeInTheDocument()
  })
})
