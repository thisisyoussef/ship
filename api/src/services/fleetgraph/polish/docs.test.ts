import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../../');

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('FleetGraph polish audit docs', () => {
  it('matches the current named demo targets', () => {
    const inspectionGuide = readRepoFile('docs/guides/fleetgraph-demo-inspection.md');

    expect(inspectionGuide).toContain('FleetGraph Demo Week - Review and Apply');
    expect(inspectionGuide).toContain('FleetGraph Demo Week - Validation Ready');
    expect(inspectionGuide).toContain('FleetGraph Demo Week - Worker Generated');
    expect(inspectionGuide).toContain('Week start drift: FleetGraph Demo Week - Review and Apply');
    expect(inspectionGuide).toContain('Week start drift: FleetGraph Demo Week - Worker Generated');
  });

  it('matches the polished live UI path', () => {
    const inspectionGuide = readRepoFile('docs/guides/fleetgraph-demo-inspection.md');
    const auditChecklist = readRepoFile(
      'docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/user-audit-checklist.md'
    );

    for (const phrase of [
      'Active finding',
      'Why this matters',
      'Suggested next step',
      'Quick actions',
      'Open FleetGraph debug',
      'FleetGraph paused for your confirmation.',
      'Review step',
    ]) {
      expect(inspectionGuide).toContain(phrase);
      expect(auditChecklist).toContain(phrase);
    }
  });

  it('keeps non-blocking follow-on feedback at the tail of the pack', () => {
    const auditChecklist = readRepoFile(
      'docs/specs/fleetgraph/FLEETGRAPH-POLISH-PHASE/user-audit-checklist.md'
    );

    expect(auditChecklist).toContain('## Tail Follow-On Slot');
    expect(auditChecklist).toContain('append them after this pack as follow-on stories');
    expect(auditChecklist).toContain('Do not reopen the finished polish stories mid-sequence');
  });
});
