import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';

import {
  FleetGraphDebugSurfaceProvider,
  useFleetGraphDebugSurface,
} from '@/components/FleetGraphDebugSurface';
import type {
  FleetGraphDebugEntrySnapshot,
  FleetGraphDebugFindingSnapshot,
} from '@/lib/fleetgraph-debug';
import { FleetGraphDebugDock } from './FleetGraphDebugDock';

function SeedDebugSurface({
  entry = null,
  findings = [],
}: {
  entry?: FleetGraphDebugEntrySnapshot | null;
  findings?: FleetGraphDebugFindingSnapshot[];
}) {
  const { setEntry, setFindings } = useFleetGraphDebugSurface();

  useEffect(() => {
    setEntry(entry);
    setFindings(findings);
  }, [entry, findings, setEntry, setFindings]);

  return null;
}

function renderDebugDock(options?: {
  entry?: FleetGraphDebugEntrySnapshot | null;
  findings?: FleetGraphDebugFindingSnapshot[];
}) {
  render(
    <FleetGraphDebugSurfaceProvider>
      <p>Human-first FleetGraph copy stays in the main cards.</p>
      <SeedDebugSurface
        entry={options?.entry}
        findings={options?.findings}
      />
      <FleetGraphDebugDock />
    </FleetGraphDebugSurfaceProvider>
  );
}

describe('FleetGraphDebugDock', () => {
  it('surfaces secondary FleetGraph details without putting them back into the main cards', async () => {
    renderDebugDock({
      entry: {
        approvalEndpoint: {
          method: 'POST',
          path: '/api/projects/launch-planner/approve-plan',
        },
        routeLabel: 'document-page / overview',
        surfaceLabel: 'document-page / overview',
        threadId: 'fleetgraph:workspace-1:document:project',
        title: 'FleetGraph paused for human approval.',
      },
      findings: [
        {
          actionEndpoint: {
            method: 'POST',
            path: '/api/weeks/week-14/start',
          },
          findingKey: 'week-start-drift:workspace-1:week-14',
          id: 'finding-1',
          status: 'active',
          threadId: 'fleetgraph:workspace-1:scheduled-sweep',
          title: 'Week start drift: FleetGraph Demo Week - Review and Apply',
          tracePublicUrl: 'https://smith.langchain.com/public/example/r',
          updatedAt: '2026-03-17T12:00:00.000Z',
        },
      ],
    });

    expect(screen.getByText('Human-first FleetGraph copy stays in the main cards.')).toBeInTheDocument();
    expect(screen.queryByText('POST /api/weeks/week-14/start')).not.toBeInTheDocument();
    expect(screen.queryByText('POST /api/projects/launch-planner/approve-plan')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /open fleetgraph debug/i }));

    expect(await screen.findByRole('dialog', { name: /fleetgraph debug/i })).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/weeks\/week-14\/start/)).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/projects\/launch-planner\/approve-plan/)).toBeInTheDocument();
    expect(screen.getByText('fleetgraph:workspace-1:scheduled-sweep')).toBeInTheDocument();
    expect(screen.getByText('fleetgraph:workspace-1:document:project')).toBeInTheDocument();
  });

  it('is keyboard reachable and dismissible', async () => {
    renderDebugDock({
      findings: [
        {
          findingKey: 'week-start-drift:workspace-1:week-14',
          id: 'finding-1',
          status: 'active',
          threadId: 'fleetgraph:workspace-1:scheduled-sweep',
          title: 'Week start drift: FleetGraph Demo Week - Review and Apply',
          updatedAt: '2026-03-17T12:00:00.000Z',
        },
      ],
    });

    const trigger = await screen.findByRole('button', { name: /open fleetgraph debug/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(await screen.findByRole('dialog', { name: /fleetgraph debug/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /fleetgraph debug/i })).not.toBeInTheDocument();
    });
  });

  it('handles missing optional fields cleanly', async () => {
    renderDebugDock({
      findings: [
        {
          findingKey: 'week-start-drift:workspace-1:week-14',
          id: 'finding-1',
          status: 'active',
          threadId: 'fleetgraph:workspace-1:scheduled-sweep',
          title: 'Week start drift: FleetGraph Demo Week - Review and Apply',
          updatedAt: '2026-03-17T12:00:00.000Z',
        },
      ],
    });

    fireEvent.click(await screen.findByRole('button', { name: /open fleetgraph debug/i }));

    expect(await screen.findByText('Week start drift: FleetGraph Demo Week - Review and Apply')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open trace evidence/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/action endpoint/i)).not.toBeInTheDocument();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });
});
