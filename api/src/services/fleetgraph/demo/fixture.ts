import type { Pool } from 'pg'

import { createFleetGraphFindingStore } from '../findings/store.js'
import { buildWeekStartFindingDraft } from '../proactive/week-start-drift.js'
import type { WeekStartDriftCandidate } from '../proactive/types.js'
import {
  FLEETGRAPH_DEMO_FINDING_SUMMARY,
  FLEETGRAPH_DEMO_PROJECT_TITLE,
  FLEETGRAPH_DEMO_THREAD_PREFIX,
  FLEETGRAPH_DEMO_WEEK_TITLE,
} from './constants.js'

type Queryable = Pick<Pool, 'query'>

export interface FleetGraphDemoFixtureInput {
  currentSprintNumber: number
  ownerEmail: string
  ownerName: string
  ownerUserId: string
  programId: string
  programName: string
  workspaceId: string
  workspaceSprintStartDate: string
}

export interface FleetGraphDemoFixtureResult {
  findingTitle: string
  projectId: string
  projectTitle: string
  weekId: string
  weekTitle: string
}

function calculateWeekStartDate(
  workspaceSprintStartDate: string,
  sprintNumber: number
) {
  const baseDate = new Date(`${workspaceSprintStartDate.slice(0, 10)}T00:00:00.000Z`)
  const startDate = new Date(baseDate)
  startDate.setUTCDate(baseDate.getUTCDate() + (sprintNumber - 1) * 7)
  return startDate
}

async function ensureAssociation(
  queryable: Queryable,
  documentId: string,
  relatedId: string,
  relationshipType: 'program' | 'project'
) {
  await queryable.query(
    `INSERT INTO document_associations (document_id, related_id, relationship_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (document_id, related_id, relationship_type) DO NOTHING`,
    [documentId, relatedId, relationshipType, JSON.stringify({ created_via: 'fleetgraph_demo_fixture' })]
  )
}

async function ensureDemoProject(
  queryable: Queryable,
  input: FleetGraphDemoFixtureInput
) {
  const existing = await queryable.query(
    `SELECT d.id
     FROM documents d
     JOIN document_associations da
       ON da.document_id = d.id
      AND da.related_id = $3
      AND da.relationship_type = 'program'
     WHERE d.workspace_id = $1
       AND d.document_type = 'project'
       AND d.title = $2`,
    [input.workspaceId, FLEETGRAPH_DEMO_PROJECT_TITLE, input.programId]
  ) as { rows: Array<{ id: string }> }

  const properties = {
    color: '#0f766e',
    emoji: '🧭',
    owner_id: input.ownerUserId,
    plan: 'Dedicated FleetGraph MVP inspection target for the public demo.',
    target_date: calculateWeekStartDate(
      input.workspaceSprintStartDate,
      input.currentSprintNumber + 1
    ).toISOString().slice(0, 10),
  }

  if (existing.rows[0]?.id) {
    await queryable.query(
      `UPDATE documents
       SET properties = $3::jsonb
       WHERE id = $1 AND workspace_id = $2`,
      [existing.rows[0].id, input.workspaceId, JSON.stringify(properties)]
    )
    return existing.rows[0].id
  }

  const inserted = await queryable.query(
    `INSERT INTO documents (workspace_id, document_type, title, properties)
     VALUES ($1, 'project', $2, $3::jsonb)
     RETURNING id`,
    [input.workspaceId, FLEETGRAPH_DEMO_PROJECT_TITLE, JSON.stringify(properties)]
  ) as { rows: Array<{ id: string }> }

  const projectId = inserted.rows[0]!.id
  await ensureAssociation(queryable, projectId, input.programId, 'program')
  return projectId
}

async function ensureDemoWeek(
  queryable: Queryable,
  input: FleetGraphDemoFixtureInput,
  projectId: string
) {
  const existing = await queryable.query(
    `SELECT d.id
     FROM documents d
     JOIN document_associations da
       ON da.document_id = d.id
      AND da.related_id = $3
      AND da.relationship_type = 'project'
     WHERE d.workspace_id = $1
       AND d.document_type = 'sprint'
       AND d.title = $2`,
    [input.workspaceId, FLEETGRAPH_DEMO_WEEK_TITLE, projectId]
  ) as { rows: Array<{ id: string }> }

  const properties = {
    confidence: 90,
    owner_id: input.ownerUserId,
    plan: 'Review the visible FleetGraph finding and use the apply confirmation path.',
    project_id: projectId,
    sprint_number: input.currentSprintNumber,
    status: 'planning',
    success_criteria: 'The public demo shows a visible proactive finding with Review and apply.',
  }

  if (existing.rows[0]?.id) {
    await queryable.query(
      `UPDATE documents
       SET properties = $3::jsonb
       WHERE id = $1 AND workspace_id = $2`,
      [existing.rows[0].id, input.workspaceId, JSON.stringify(properties)]
    )
    await ensureAssociation(queryable, existing.rows[0].id, projectId, 'project')
    await ensureAssociation(queryable, existing.rows[0].id, input.programId, 'program')
    return existing.rows[0].id
  }

  const inserted = await queryable.query(
    `INSERT INTO documents (workspace_id, document_type, title, properties)
     VALUES ($1, 'sprint', $2, $3::jsonb)
     RETURNING id`,
    [input.workspaceId, FLEETGRAPH_DEMO_WEEK_TITLE, JSON.stringify(properties)]
  ) as { rows: Array<{ id: string }> }

  const weekId = inserted.rows[0]!.id
  await ensureAssociation(queryable, weekId, projectId, 'project')
  await ensureAssociation(queryable, weekId, input.programId, 'program')
  return weekId
}

export async function ensureFleetGraphDemoProofLane(
  queryable: Queryable,
  input: FleetGraphDemoFixtureInput,
  now = new Date()
): Promise<FleetGraphDemoFixtureResult> {
  const findingStore = createFleetGraphFindingStore(queryable)
  const projectId = await ensureDemoProject(queryable, input)
  const weekId = await ensureDemoWeek(queryable, input, projectId)
  const startDate = calculateWeekStartDate(
    input.workspaceSprintStartDate,
    input.currentSprintNumber
  )

  const candidate: WeekStartDriftCandidate = {
    startDate,
    statusReason: 'planning_after_start',
    week: {
      id: weekId,
      issue_count: 0,
      name: FLEETGRAPH_DEMO_WEEK_TITLE,
      owner: {
        email: input.ownerEmail,
        id: input.ownerUserId,
        name: input.ownerName,
      },
      program_name: input.programName,
      sprint_number: input.currentSprintNumber,
      status: 'planning',
      workspace_sprint_start_date: input.workspaceSprintStartDate,
    },
  }

  const draft = buildWeekStartFindingDraft(
    candidate,
    input.workspaceId,
    FLEETGRAPH_DEMO_FINDING_SUMMARY
  )

  const existingFinding = await findingStore.getFindingByKey(draft.findingKey)
  if (existingFinding) {
    await queryable.query(
      'DELETE FROM fleetgraph_finding_action_runs WHERE finding_id = $1',
      [existingFinding.id]
    )
    await queryable.query(
      'DELETE FROM fleetgraph_proactive_findings WHERE id = $1',
      [existingFinding.id]
    )
  }

  await findingStore.upsertFinding({
    dedupeKey: `demo:${draft.findingKey}`,
    documentId: weekId,
    documentType: 'sprint',
    evidence: draft.evidence,
    findingKey: draft.findingKey,
    findingType: 'week_start_drift',
    metadata: {
      ...draft.metadata,
      demoFixture: true,
      inspectionProjectTitle: FLEETGRAPH_DEMO_PROJECT_TITLE,
      inspectionWeekTitle: FLEETGRAPH_DEMO_WEEK_TITLE,
    },
    recommendedAction: draft.recommendedAction,
    summary: draft.summary,
    threadId: `${FLEETGRAPH_DEMO_THREAD_PREFIX}:${input.workspaceId}:${weekId}`,
    title: draft.title,
    workspaceId: input.workspaceId,
  }, now)

  return {
    findingTitle: draft.title,
    projectId,
    projectTitle: FLEETGRAPH_DEMO_PROJECT_TITLE,
    weekId,
    weekTitle: FLEETGRAPH_DEMO_WEEK_TITLE,
  }
}
