/**
 * FleetGraph Demo Seed Data
 *
 * Creates documents with fixed UUIDs that trigger each of the 9 FleetGraph
 * finding types. Uses INSERT ... ON CONFLICT for idempotency so the seed
 * can run repeatedly without duplicating data.
 */

import type { Pool } from 'pg'

import { DEMO_IDS } from './constants.js'

// ──────────────────────────────────────────────────────────────────────────────
// Public Interface
// ──────────────────────────────────────────────────────────────────────────────

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
    updatedAtOverride?: string
  ) {
    const propsJson = JSON.stringify(properties)
    if (updatedAtOverride) {
      await pool.query(
        `INSERT INTO documents (id, workspace_id, document_type, title, properties, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           properties = EXCLUDED.properties,
           updated_at = EXCLUDED.updated_at`,
        [id, workspaceId, documentType, title, propsJson, updatedAtOverride]
      )
    } else {
      await pool.query(
        `INSERT INTO documents (id, workspace_id, document_type, title, properties)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           properties = EXCLUDED.properties`,
        [id, workspaceId, documentType, title, propsJson]
      )
    }
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
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  function sprintStartDate(sprintNumber: number): string {
    const base = new Date(`${workspaceSprintStartDate.slice(0, 10)}T00:00:00.000Z`)
    base.setUTCDate(base.getUTCDate() + (sprintNumber - 1) * 7)
    return base.toISOString().slice(0, 10)
  }

  // ── 1. week_start_drift ──────────────────────────────────────────────────
  // Sprint in "planning" status but start date has passed

  await upsertDocument(DEMO_IDS.WEEK_START_DRIFT, 'sprint', 'Demo: Week Start Drift', {
    confidence: 80,
    owner_id: ownerUserId,
    plan: 'This demo sprint is stuck in planning even though the start date has passed.',
    sprint_number: currentSprintNumber,
    sprint_start_date: sprintStartDate(currentSprintNumber),
    status: 'planning',
  })
  await associateToProjectAndProgram(DEMO_IDS.WEEK_START_DRIFT)

  // ── 2. empty_active_week ─────────────────────────────────────────────────
  // Sprint is "active" but has 0 scoped issues

  await upsertDocument(DEMO_IDS.EMPTY_ACTIVE_WEEK, 'sprint', 'Demo: Empty Active Week', {
    confidence: 70,
    owner_id: ownerUserId,
    plan: 'This active sprint has no issues scoped to it.',
    sprint_number: currentSprintNumber > 1 ? currentSprintNumber - 1 : 1,
    sprint_start_date: sprintStartDate(currentSprintNumber > 1 ? currentSprintNumber - 1 : 1),
    status: 'active',
  })
  await associateToProjectAndProgram(DEMO_IDS.EMPTY_ACTIVE_WEEK)

  // ── 3. sprint_no_owner ───────────────────────────────────────────────────
  // Sprint in "planning" with no owner_id

  await upsertDocument(DEMO_IDS.SPRINT_NO_OWNER, 'sprint', 'Demo: Sprint No Owner', {
    confidence: 60,
    plan: 'This sprint has no owner assigned.',
    sprint_number: currentSprintNumber,
    sprint_start_date: sprintStartDate(currentSprintNumber),
    status: 'planning',
    // Note: no owner_id
  })
  await associateToProjectAndProgram(DEMO_IDS.SPRINT_NO_OWNER)

  // ── 4. unassigned_sprint_issues ──────────────────────────────────────────
  // Active sprint with 4 issues that have no assignee

  await upsertDocument(DEMO_IDS.UNASSIGNED_ISSUES, 'sprint', 'Demo: Unassigned Issues Sprint', {
    confidence: 85,
    owner_id: ownerUserId,
    plan: 'This active sprint has issues but none are assigned.',
    sprint_number: currentSprintNumber,
    sprint_start_date: sprintStartDate(currentSprintNumber),
    status: 'active',
  })
  await associateToProjectAndProgram(DEMO_IDS.UNASSIGNED_ISSUES)

  // Create the 4 unassigned issues
  const unassignedIssueIds = [
    DEMO_IDS.UNASSIGNED_ISSUE_1,
    DEMO_IDS.UNASSIGNED_ISSUE_2,
    DEMO_IDS.UNASSIGNED_ISSUE_3,
    DEMO_IDS.UNASSIGNED_ISSUE_4,
  ]
  for (let i = 0; i < unassignedIssueIds.length; i++) {
    const issueId = unassignedIssueIds[i]!
    await upsertDocument(issueId, 'issue', `Demo: Unassigned Issue ${i + 1}`, {
      estimate: 3,
      priority: i < 2 ? 'high' : 'medium',
      state: 'open',
      // Note: no assignee_ids
    })
    await ensureAssociation(issueId, DEMO_IDS.UNASSIGNED_ISSUES, 'sprint')
    await associateToProjectAndProgram(issueId)
  }

  // ── 5. approval_gap ──────────────────────────────────────────────────────
  // Sprint with plan submitted 2+ business days ago

  await upsertDocument(DEMO_IDS.APPROVAL_GAP, 'sprint', 'Demo: Approval Gap Sprint', {
    confidence: 75,
    owner_id: ownerUserId,
    plan: 'This sprint plan was submitted but has not been approved yet.',
    plan_approval: {
      state: 'submitted',
      submitted_at: daysAgo(3),
    },
    sprint_number: currentSprintNumber,
    sprint_start_date: sprintStartDate(currentSprintNumber),
    status: 'planning',
  })
  await associateToProjectAndProgram(DEMO_IDS.APPROVAL_GAP)

  // ── 6. deadline_risk ─────────────────────────────────────────────────────
  // Project with target_date 3 days away and open issues

  await upsertDocument(DEMO_IDS.DEADLINE_RISK_PROJECT, 'project', 'Demo: Deadline Risk Project', {
    color: '#dc2626',
    emoji: '🚨',
    owner_id: ownerUserId,
    plan: 'This project has an approaching deadline with open issues.',
    target_date: daysFromNow(3),
  })
  await ensureAssociation(DEMO_IDS.DEADLINE_RISK_PROJECT, programId, 'program')

  // ── 7. blocker_aging ─────────────────────────────────────────────────────
  // Issue in "blocked" state with no update for 5+ days

  await upsertDocument(
    DEMO_IDS.BLOCKER_AGING_ISSUE,
    'issue',
    'Demo: Aging Blocker Issue',
    {
      assignee_ids: [ownerUserId],
      blocker_text: 'Waiting on external API access that was requested last week.',
      estimate: 5,
      priority: 'high',
      state: 'blocked',
    },
    daysAgo(5) // updated_at override
  )
  await associateToProjectAndProgram(DEMO_IDS.BLOCKER_AGING_ISSUE)
}
