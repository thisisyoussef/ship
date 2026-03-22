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
