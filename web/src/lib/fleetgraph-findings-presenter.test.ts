import { describe, expect, it } from 'vitest';

import {
  buildFindingSummary,
  renderExecutionLabel,
} from '@/lib/fleetgraph-findings-presenter';
import type { FleetGraphFinding } from '@/lib/fleetgraph-findings';

function makeFinding(
  overrides: Partial<FleetGraphFinding> = {}
): FleetGraphFinding {
  return {
    dedupeKey: 'dedupe-1',
    documentId: 'sprint-1',
    documentType: 'sprint',
    evidence: ['Sprint 8 is still planning after the expected start window.'],
    findingKey: 'week-start-drift:workspace-1:sprint-8',
    findingType: 'week_start_drift',
    id: 'finding-1',
    metadata: {},
    status: 'active',
    summary: 'Sprint 8 still needs attention.',
    threadId: 'fleetgraph:workspace-1:scheduled-sweep',
    title: 'Week start drift: Sprint 8',
    updatedAt: '2026-03-17T12:00:00.000Z',
    workspaceId: 'workspace-1',
    ...overrides,
  };
}

describe('fleetgraph findings presenter', () => {
  it('keeps non-week-start summaries generic on the shared proactive surface', () => {
    const finding = makeFinding({
      findingKey: 'sprint-no-owner:workspace-1:sprint-8',
      findingType: 'sprint_no_owner',
      summary: 'Sprint 8 needs a named owner before work coordination slips.',
      title: 'Sprint owner gap: Sprint 8',
    });

    expect(buildFindingSummary(finding))
      .toBe('Sprint 8 needs a named owner before work coordination slips.');
  });

  it('keeps execution labels generic when no Ship write has run', () => {
    expect(renderExecutionLabel(makeFinding())).toBe('Suggested next step');
  });
});
