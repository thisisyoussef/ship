/**
 * FleetGraph Demo Seed Data
 *
 * Creates 3 demo sprints with fixed UUIDs, each designed to trigger
 * specific combinations of proactive findings:
 *
 * Sprint 1 ("All Three")    → week_start_drift + sprint_no_owner + approval_gap
 * Sprint 2 ("Drift + Owner") → week_start_drift + sprint_no_owner
 * Sprint 3 ("Approval Only") → approval_gap
 *
 * The proactive pipeline picks these up naturally — no override needed.
 * Each sprint's state is set so the detectors fire deterministically.
 */

import type { Pool } from 'pg'

import { DEMO_IDS } from './constants.js'

export interface SeedFleetGraphDemoDataInput {
  currentSprintNumber: number
  ownerUserId: string
  programId: string
  projectId: string
  workspaceId: string
  workspaceSprintStartDate: string
}

export async function seedFleetGraphDemoData(
  pool: Pool,
  input: SeedFleetGraphDemoDataInput
): Promise<void> {
  const {
    currentSprintNumber,
    ownerUserId,
    programId,
    projectId,
    workspaceId,
    workspaceSprintStartDate,
  } = input

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function upsertDocument(
    id: string,
    documentType: string,
    title: string,
    properties: Record<string, unknown>,
  ) {
    const propsJson = JSON.stringify(properties)
    await pool.query(
      `INSERT INTO documents (id, workspace_id, document_type, title, properties)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         properties = EXCLUDED.properties`,
      [id, workspaceId, documentType, title, propsJson]
    )
  }

  async function ensureAssociation(
    documentId: string,
    relatedId: string,
    relationshipType: 'program' | 'project' | 'sprint'
  ) {
    await pool.query(
      `INSERT INTO document_associations (document_id, related_id, relationship_type, metadata)
       VALUES ($1, $2, $3, '{"created_via":"fleetgraph_demo_seed"}'::jsonb)
       ON CONFLICT (document_id, related_id, relationship_type) DO NOTHING`,
      [documentId, relatedId, relationshipType]
    )
  }

  async function associateToProjectAndProgram(documentId: string) {
    await ensureAssociation(documentId, projectId, 'project')
    await ensureAssociation(documentId, programId, 'program')
  }

  // ── Date helpers ─────────────────────────────────────────────────────────

  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

  // ── Delete old demo documents that no longer exist in DEMO_IDS ──────────

  const oldDemoIds = [
    'f1000000-0000-0000-0000-000000000040', // old UNASSIGNED_ISSUES
    'f1000000-0000-0000-0000-000000000041', // old UNASSIGNED_ISSUE_1
    'f1000000-0000-0000-0000-000000000042', // old UNASSIGNED_ISSUE_2
    'f1000000-0000-0000-0000-000000000043', // old UNASSIGNED_ISSUE_3
    'f1000000-0000-0000-0000-000000000044', // old UNASSIGNED_ISSUE_4
    'f1000000-0000-0000-0000-000000000050', // old APPROVAL_GAP
    'f1000000-0000-0000-0000-000000000060', // old DEADLINE_RISK_PROJECT
    'f1000000-0000-0000-0000-000000000070', // old BLOCKER_AGING_ISSUE
  ]
  for (const oldId of oldDemoIds) {
    await pool.query('DELETE FROM document_associations WHERE document_id = $1 OR related_id = $1', [oldId])
    await pool.query('DELETE FROM documents WHERE id = $1', [oldId])
  }

  // ── Sprint 1: "All Three" ──────────────────────────────────────────────
  // Triggers: week_start_drift + sprint_no_owner + approval_gap
  // State: planning, past start date, NO owner, plan submitted 3 days ago
  await upsertDocument(DEMO_IDS.SPRINT_ALL_THREE, 'sprint', 'Demo: Needs Start, Owner & Approval', {
    confidence: 80,
    // No owner_id — triggers sprint_no_owner
    plan: 'Showcase sprint that triggers all three proactive findings simultaneously.',
    plan_approval: {
      state: 'submitted',
      submitted_at: daysAgo(3), // triggers approval_gap
    },
    sprint_number: currentSprintNumber, // past start → triggers week_start_drift
    status: 'planning',
    success_criteria: 'All three findings appear in the Findings tab at once.',
  })
  await associateToProjectAndProgram(DEMO_IDS.SPRINT_ALL_THREE)

  // ── Sprint 2: "Drift + No Owner" ──────────────────────────────────────
  // Triggers: week_start_drift + sprint_no_owner
  // State: planning, past start date, NO owner, no plan submitted
  await upsertDocument(DEMO_IDS.SPRINT_DRIFT_NO_OWNER, 'sprint', 'Demo: Needs Start & Owner', {
    confidence: 70,
    // No owner_id — triggers sprint_no_owner
    plan: 'Showcase sprint that needs both starting and an owner.',
    sprint_number: currentSprintNumber, // past start → triggers week_start_drift
    status: 'planning',
    success_criteria: 'Two findings appear: week start drift + no owner.',
  })
  await associateToProjectAndProgram(DEMO_IDS.SPRINT_DRIFT_NO_OWNER)

  // ── Sprint 3: "Approval Only" ─────────────────────────────────────────
  // Triggers: approval_gap only
  // State: planning, HAS owner, plan submitted 3 days ago
  await upsertDocument(DEMO_IDS.SPRINT_APPROVAL_ONLY, 'sprint', 'Demo: Needs Plan Approval', {
    confidence: 90,
    owner_id: ownerUserId, // has owner — won't trigger sprint_no_owner
    assignee_ids: [ownerUserId],
    plan: 'Showcase sprint where only the approval gap finding fires.',
    plan_approval: {
      state: 'submitted',
      submitted_at: daysAgo(3), // triggers approval_gap
    },
    sprint_number: currentSprintNumber + 1, // future start → won't trigger week_start_drift
    status: 'planning',
    success_criteria: 'Only the approval gap finding appears.',
  })
  await associateToProjectAndProgram(DEMO_IDS.SPRINT_APPROVAL_ONLY)

  // ── Clean up old-format findings from previous seed runs ────────────────
  // Previous seeds used keys like `week-start-drift:${workspaceId}:${id}`.
  // The pipeline uses `week_start_drift:${id}`. Delete old-format duplicates.
  const demoDocIds = [DEMO_IDS.SPRINT_ALL_THREE, DEMO_IDS.SPRINT_DRIFT_NO_OWNER, DEMO_IDS.SPRINT_APPROVAL_ONLY]
  for (const docId of demoDocIds) {
    await pool.query(
      `DELETE FROM fleetgraph_proactive_findings
       WHERE document_id = $1 AND finding_key LIKE '%' || $2 || '%' || $1
       AND finding_key LIKE '%-%'`,
      [docId, workspaceId]
    )
  }

  // ── Seed findings directly so they appear immediately ──────────────────
  // The proactive worker would detect these naturally, but in dev mode
  // (no separate worker process), we insert findings at seed time.

  const findingStore = (await import('../findings/store.js')).createFleetGraphFindingStore(pool)

  // Use the EXACT same fingerprint format as the V2 pipeline (check-dedupe-cooldown.ts:
  // computeFingerprint returns `${suspect.type}:${suspect.entityId}`)
  // This ensures seeded findings and worker-detected findings are the SAME row.
  const fp = (type: string, entityId: string) => `${type}:${entityId}`

  // Sprint 1: 3 findings
  await findingStore.upsertFinding({
    dedupeKey: fp('week_start_drift', DEMO_IDS.SPRINT_ALL_THREE),
    documentId: DEMO_IDS.SPRINT_ALL_THREE,
    documentType: 'sprint',
    evidence: ['Sprint status is "planning" but the start date has passed.', 'Starting the week would unblock issue tracking and standups.'],
    findingKey: fp('week_start_drift', DEMO_IDS.SPRINT_ALL_THREE),
    findingType: 'week_start_drift',
    metadata: { demoFixture: true },
    recommendedAction: {
      endpoint: { method: 'POST', path: `/api/weeks/${DEMO_IDS.SPRINT_ALL_THREE}/start` },
      evidence: ['Sprint is still in planning after start date.'],
      rationale: 'Starting the week unblocks issue tracking.',
      summary: 'Start this week to unblock the team.',
      targetId: DEMO_IDS.SPRINT_ALL_THREE,
      targetType: 'sprint',
      title: 'Start this week',
      type: 'start_week',
    },
    summary: 'This week is still in planning even though its start window has passed.',
    threadId: `demo:${DEMO_IDS.SPRINT_ALL_THREE}:drift`,
    title: 'Week is still in planning',
    workspaceId,
  }, now)

  await findingStore.upsertFinding({
    dedupeKey: fp('sprint_no_owner', DEMO_IDS.SPRINT_ALL_THREE),
    documentId: DEMO_IDS.SPRINT_ALL_THREE,
    documentType: 'sprint',
    evidence: ['Sprint has no owner assigned.', 'Without an owner, nobody is accountable for execution.'],
    findingKey: fp('sprint_no_owner', DEMO_IDS.SPRINT_ALL_THREE),
    findingType: 'sprint_no_owner',
    metadata: { demoFixture: true },
    recommendedAction: {
      endpoint: { method: 'PATCH', path: `/api/documents/${DEMO_IDS.SPRINT_ALL_THREE}` },
      evidence: ['No owner_id assigned.'],
      rationale: 'Assigning an owner ensures accountability.',
      summary: 'Assign an owner to this week.',
      targetId: DEMO_IDS.SPRINT_ALL_THREE,
      targetType: 'sprint',
      title: 'Assign an owner',
      type: 'assign_owner',
    },
    summary: 'This week has no owner assigned.',
    threadId: `demo:${DEMO_IDS.SPRINT_ALL_THREE}:no-owner`,
    title: 'Week has no owner',
    workspaceId,
  }, now)

  await findingStore.upsertFinding({
    dedupeKey: fp('approval_gap', DEMO_IDS.SPRINT_ALL_THREE),
    documentId: DEMO_IDS.SPRINT_ALL_THREE,
    documentType: 'sprint',
    evidence: ['Week plan was submitted 3 business days ago.', 'The owner may be blocked waiting for approval.'],
    findingKey: fp('approval_gap', DEMO_IDS.SPRINT_ALL_THREE),
    findingType: 'approval_gap',
    metadata: { demoFixture: true },
    recommendedAction: {
      endpoint: { method: 'POST', path: `/api/weeks/${DEMO_IDS.SPRINT_ALL_THREE}/approve-plan` },
      evidence: ['Plan submitted 3 days ago.'],
      rationale: 'Reviewing and approving unblocks the next planning cycle.',
      summary: 'Approve this week plan.',
      targetId: DEMO_IDS.SPRINT_ALL_THREE,
      targetType: 'sprint',
      title: 'Approve week plan',
      type: 'approve_week_plan',
    },
    summary: 'This week plan has been waiting 3 business days for approval.',
    threadId: `demo:${DEMO_IDS.SPRINT_ALL_THREE}:approval`,
    title: 'Week plan needs review',
    workspaceId,
  }, now)

  // Sprint 2: 2 findings
  await findingStore.upsertFinding({
    dedupeKey: fp('week_start_drift', DEMO_IDS.SPRINT_DRIFT_NO_OWNER),
    documentId: DEMO_IDS.SPRINT_DRIFT_NO_OWNER,
    documentType: 'sprint',
    evidence: ['Sprint status is "planning" but the start date has passed.'],
    findingKey: fp('week_start_drift', DEMO_IDS.SPRINT_DRIFT_NO_OWNER),
    findingType: 'week_start_drift',
    metadata: { demoFixture: true },
    recommendedAction: {
      endpoint: { method: 'POST', path: `/api/weeks/${DEMO_IDS.SPRINT_DRIFT_NO_OWNER}/start` },
      evidence: ['Sprint is still in planning after start date.'],
      rationale: 'Starting the week unblocks issue tracking.',
      summary: 'Start this week.',
      targetId: DEMO_IDS.SPRINT_DRIFT_NO_OWNER,
      targetType: 'sprint',
      title: 'Start this week',
      type: 'start_week',
    },
    summary: 'This week is still in planning.',
    threadId: `demo:${DEMO_IDS.SPRINT_DRIFT_NO_OWNER}:drift`,
    title: 'Week is still in planning',
    workspaceId,
  }, now)

  await findingStore.upsertFinding({
    dedupeKey: fp('sprint_no_owner', DEMO_IDS.SPRINT_DRIFT_NO_OWNER),
    documentId: DEMO_IDS.SPRINT_DRIFT_NO_OWNER,
    documentType: 'sprint',
    evidence: ['Sprint has no owner assigned.'],
    findingKey: fp('sprint_no_owner', DEMO_IDS.SPRINT_DRIFT_NO_OWNER),
    findingType: 'sprint_no_owner',
    metadata: { demoFixture: true },
    recommendedAction: {
      endpoint: { method: 'PATCH', path: `/api/documents/${DEMO_IDS.SPRINT_DRIFT_NO_OWNER}` },
      evidence: ['No owner assigned.'],
      rationale: 'Assigning an owner ensures accountability.',
      summary: 'Assign an owner.',
      targetId: DEMO_IDS.SPRINT_DRIFT_NO_OWNER,
      targetType: 'sprint',
      title: 'Assign an owner',
      type: 'assign_owner',
    },
    summary: 'This week has no owner.',
    threadId: `demo:${DEMO_IDS.SPRINT_DRIFT_NO_OWNER}:no-owner`,
    title: 'Week has no owner',
    workspaceId,
  }, now)

  // Sprint 3: 1 finding
  await findingStore.upsertFinding({
    dedupeKey: fp('approval_gap', DEMO_IDS.SPRINT_APPROVAL_ONLY),
    documentId: DEMO_IDS.SPRINT_APPROVAL_ONLY,
    documentType: 'sprint',
    evidence: ['Week plan was submitted 3 business days ago.', 'Reviewing and approving unblocks the next cycle.'],
    findingKey: fp('approval_gap', DEMO_IDS.SPRINT_APPROVAL_ONLY),
    findingType: 'approval_gap',
    metadata: { demoFixture: true },
    recommendedAction: {
      endpoint: { method: 'POST', path: `/api/weeks/${DEMO_IDS.SPRINT_APPROVAL_ONLY}/approve-plan` },
      evidence: ['Plan submitted 3 days ago.'],
      rationale: 'Approving unblocks the owner.',
      summary: 'Approve this week plan.',
      targetId: DEMO_IDS.SPRINT_APPROVAL_ONLY,
      targetType: 'sprint',
      title: 'Approve week plan',
      type: 'approve_week_plan',
    },
    summary: 'This week plan has been waiting for approval.',
    threadId: `demo:${DEMO_IDS.SPRINT_APPROVAL_ONLY}:approval`,
    title: 'Week plan needs review',
    workspaceId,
  }, now)
}
