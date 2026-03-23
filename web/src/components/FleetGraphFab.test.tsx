import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useFleetGraphAnalysis', () => ({
  useFleetGraphAnalysis: vi.fn(),
}))

vi.mock('@/hooks/useFleetGraphEntry', () => ({
  useFleetGraphEntry: vi.fn(),
}))

import { useFleetGraphAnalysis } from '@/hooks/useFleetGraphAnalysis'
import { FleetGraphFab } from './FleetGraphFab'

describe('FleetGraphFab', () => {
  beforeEach(() => {
    vi.mocked(useFleetGraphAnalysis).mockReset()

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
  })

  it('renders suggested next steps as plain text instead of clickable buttons', () => {
    render(
      <FleetGraphFab
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
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
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /fleetgraph intelligence/i }))

    expect(screen.getByPlaceholderText('Ask a follow-up...')).toHaveClass('text-black')
  })

  it('starts analysis when the user opens the FAB on a document page', () => {
    const analyze = vi.fn()
    vi.mocked(useFleetGraphAnalysis).mockReturnValue({
      analyze,
      applyError: null,
      applyFindingAction: vi.fn(),
      conversation: [],
      isAnalyzing: false,
      isApplying: false,
      isResponding: false,
      pendingActionFindingId: null,
      reset: vi.fn(),
      sendMessage: vi.fn(),
      threadId: null,
    })

    render(
      <FleetGraphFab
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
      />
    )

    expect(screen.queryByPlaceholderText('Ask a follow-up...')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /fleetgraph intelligence/i }))

    expect(analyze).toHaveBeenCalledWith('doc-123', 'sprint', 'Sprint 8')
    expect(screen.getByPlaceholderText('Ask a follow-up...')).toBeInTheDocument()
  })

  it('keeps the FAB analysis-only instead of rendering a guided-actions tab', () => {
    render(
      <FleetGraphFab
        documentId="doc-123"
        documentTitle="Sprint 8"
        documentType="sprint"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /fleetgraph intelligence/i }))

    expect(screen.queryByRole('button', { name: 'Guided actions' })).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask a follow-up...')).toBeInTheDocument()
  })
})
