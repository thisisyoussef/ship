import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FleetGraphPanelShell } from './FleetGraphPanelShell';

function renderShell(props?: Partial<{
  activeFindingCount: number;
  isLoading: boolean;
  children: ReactNode;
}>) {
  return render(
    <FleetGraphPanelShell
      activeFindingCount={props?.activeFindingCount ?? 0}
      isLoading={props?.isLoading ?? false}
    >
      {props?.children ?? <div>FleetGraph body</div>}
    </FleetGraphPanelShell>
  );
}

describe('FleetGraphPanelShell', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts collapsed and surfaces a proactive notification affordance', () => {
    renderShell({ activeFindingCount: 2 });

    expect(screen.getByRole('button', { name: /open fleetgraph panel/i })).toBeInTheDocument();
    expect(screen.getByLabelText('2 proactive alerts')).toBeInTheDocument();
    expect(screen.queryByText('FleetGraph body')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open fleetgraph panel/i }));

    expect(screen.getByRole('button', { name: /collapse fleetgraph panel/i })).toBeInTheDocument();
    expect(screen.getByText('FleetGraph body')).toBeInTheDocument();
  });

  it('uses flat header tones instead of gradients for alert and monitoring states', () => {
    const { rerender } = renderShell({ activeFindingCount: 2 });

    const alertButton = screen.getByRole('button', { name: /open fleetgraph panel/i });
    expect(alertButton.className).toContain('bg-amber-50');
    expect(alertButton.className).toContain('hover:bg-amber-100/80');
    expect(alertButton.className).not.toContain('bg-gradient-to-r');
    expect(screen.getByText('Proactive alerts on this page').className).toContain('text-slate-950');

    rerender(
      <FleetGraphPanelShell activeFindingCount={0}>
        <div>FleetGraph body</div>
      </FleetGraphPanelShell>
    );

    const calmButton = screen.getByRole('button', { name: /open fleetgraph panel/i });
    expect(calmButton.className).toContain('bg-sky-50/70');
    expect(calmButton.className).toContain('hover:bg-sky-100/80');
    expect(calmButton.className).not.toContain('bg-gradient-to-r');
    expect(screen.getByText('Proactive alerts on this page').className).toContain('text-slate-950');
  });

  it('caps expanded content to the visible viewport height', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 240,
      width: 0,
      x: 0,
      y: 0,
    });

    renderShell();

    fireEvent.click(screen.getByRole('button', { name: /open fleetgraph panel/i }));

    await waitFor(() => {
      expect(screen.getByTestId('fleetgraph-panel-scroll-region')).toHaveStyle({
        maxHeight: '636px',
      });
    });
  });
});
