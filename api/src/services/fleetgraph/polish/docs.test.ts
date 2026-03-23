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
    const demoScript = readRepoFile('docs/assignments/fleetgraph/DEMO_SCRIPT.md');

    expect(inspectionGuide).toContain('FleetGraph Demo Week - Review and Apply');
    expect(inspectionGuide).toContain('FleetGraph Demo Week - One Story');
    expect(inspectionGuide).toContain('FleetGraph Demo Week - Unassigned Issues');
    expect(inspectionGuide).toContain('FleetGraph Demo Week - Validation Ready');
    expect(inspectionGuide).toContain('FleetGraph Demo Week - Worker Generated');
    expect(inspectionGuide).toContain('Week start drift: FleetGraph Demo Week - Review and Apply');
    expect(inspectionGuide).toContain('Week start drift: FleetGraph Demo Week - One Story');
    expect(inspectionGuide).toContain('3 unassigned issues in FleetGraph Demo Week - Unassigned Issues');
    expect(inspectionGuide).toContain('Week start drift: FleetGraph Demo Week - Worker Generated');
    expect(demoScript).toContain('FleetGraph Demo Week - One Story');
    expect(demoScript).toContain('Detection -> graph -> decision -> human step -> result');
    expect(demoScript).toContain('019d18d1-3d4c-7018-b282-710da7ec0f2a');
    expect(demoScript).toContain('019d18c8-23ae-76a2-ae68-955a3e1d163d');
    expect(demoScript).toContain('019d18c7-382b-73f8-9a62-5cdc176254df');
    expect(demoScript).toContain('click `Share`, and use the returned public URL');
  });

  it('records the seeded-but-blocked unassigned-issues public-demo lane truthfully', () => {
    const inspectionGuide = readRepoFile('docs/guides/fleetgraph-demo-inspection.md');
    const workbook = readRepoFile('docs/assignments/fleetgraph/FLEETGRAPH.md');
    const evidenceBundle = readRepoFile('docs/evidence/fleetgraph-mvp-evidence.md');
    const auditChecklist = readRepoFile(
      'docs/specs/fleetgraph/FLEETGRAPH-ASSIGNMENT-COMPLETION-PHASE/user-audit-checklist.md'
    );

    for (const file of [inspectionGuide, workbook, evidenceBundle, auditChecklist]) {
      expect(file.replace(/\s+/g, ' ')).toContain(
        'seeded in repo but blocked on the current public Railway findings feed'
      );
    }
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
