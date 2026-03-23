import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FleetGraphEntryCard } from './FleetGraphEntryCard'

describe('FleetGraphEntryCard', () => {
  it('keeps Check this page as the entry-card launcher', () => {
    const onCheckCurrentContext = vi.fn()

    render(
      <FleetGraphEntryCard
        helperText="FleetGraph can review the page you are on and suggest the next step."
        onCheckCurrentContext={onCheckCurrentContext}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /check this page/i }))

    expect(onCheckCurrentContext).toHaveBeenCalled()
  })

  it('moves Preview next step guidance into the FAB instead of rendering that action inline', () => {
    render(
      <FleetGraphEntryCard
        helperText="FleetGraph can review the page you are on and suggest the next step."
      />
    )

    expect(
      screen.getByText(/use the fab's guided-actions panel when you want the next suggested step/i)
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /preview next step/i })).not.toBeInTheDocument()
  })

  it('disables the page-analysis launcher when FleetGraph context is not ready', () => {
    render(
      <FleetGraphEntryCard
        helperText="Loading the current Ship context for FleetGraph."
        isActionDisabled
      />
    )

    expect(screen.getByRole('button', { name: /check this page/i })).toBeDisabled()
  })
})
