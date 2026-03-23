import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FleetGraphFindingCard } from './FleetGraphFindingCard'

const FINDING = {
  dedupeKey: 'dedupe-1',
  documentId: 'sprint-8',
  documentType: 'sprint',
  evidence: ['Sprint 8 still has no owner assigned.'],
  findingKey: 'sprint-no-owner:workspace-1:sprint-8',
  findingType: 'sprint_no_owner' as const,
  id: 'finding-1',
  metadata: {},
  recommendedAction: {
    endpoint: {
      method: 'PATCH' as const,
      path: '/api/documents/sprint-8',
    },
    evidence: ['Sprint 8 still has no owner assigned.'],
    rationale: 'Assign an owner so sprint coordination has a clear accountable person.',
    summary: 'Assign a sprint owner.',
    targetId: 'sprint-8',
    targetType: 'sprint' as const,
    title: 'Assign sprint owner',
    type: 'assign_owner' as const,
  },
  status: 'active' as const,
  summary: 'Sprint 8 needs a named owner before work coordination slips.',
  threadId: 'fleetgraph:workspace-1:scheduled-sweep',
  title: 'Sprint owner gap: Sprint 8',
  updatedAt: '2026-03-22T04:00:00.000Z',
  workspaceId: 'workspace-1',
}

describe('FleetGraphFindingCard', () => {
  it('renders a related-document action when the global queue provides one', () => {
    const onOpenDocument = vi.fn()

    render(
      <FleetGraphFindingCard
        confirming={false}
        finding={FINDING}
        isMutating={false}
        onApply={vi.fn()}
        onCancelReview={vi.fn()}
        onDismiss={vi.fn()}
        onOpenDocument={onOpenDocument}
        onReview={vi.fn()}
        onSnooze={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /open related document/i }))

    expect(onOpenDocument).toHaveBeenCalledWith(FINDING)
  })
})
