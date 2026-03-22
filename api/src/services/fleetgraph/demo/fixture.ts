import type { Pool } from 'pg'

import { createFleetGraphFindingStore } from '../findings/store.js'
import { createFleetGraphWorkerStore } from '../worker/store.js'
import {
  buildFleetGraphDedupeKey,
  buildFleetGraphThreadId,
} from '../worker/keys.js'
import { buildWeekStartFindingDraft } from '../proactive/week-start-drift.js'
import type { WeekStartDriftCandidate } from '../proactive/types.js'
import {
  FLEETGRAPH_DEMO_FINDING_SUMMARY,
  FLEETGRAPH_DEMO_PROJECT_TITLE,
  FLEETGRAPH_DEMO_THREAD_PREFIX,
  FLEETGRAPH_DEMO_VALIDATION_WEEK_TITLE,
  FLEETGRAPH_DEMO_WORKER_FINDING_TITLE,
  FLEETGRAPH_DEMO_WORKER_WEEK_TITLE,
  FLEETGRAPH_DEMO_WEEK_TITLE,
} from './constants.js'

type Queryable = Pick<Pool, 'connect' | 'query'>

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
  validationWeekId: string
  validationWeekTitle: string
  workerFindingTitle: string
  workerWeekId: string
  workerWeekTitle: string
  weekId: string
  weekTitle: string
}

interface DemoWeekInput {
  plan: string
  sprintNumber: number
  status: 'active' | 'completed' | 'planning'
  successCriteria: string
  title: string
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
  relationshipType: 'program' | 'project' | 'sprint'
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
  projectId: string,
  week: DemoWeekInput
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
    [input.workspaceId, week.title, projectId]
  ) as { rows: Array<{ id: string }> }

  const properties = {
    confidence: 90,
    owner_id: input.ownerUserId,
    plan: week.plan,
    project_id: projectId,
    sprint_number: week.sprintNumber,
    status: week.status,
    success_criteria: week.successCriteria,
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
    [input.workspaceId, week.title, JSON.stringify(properties)]
  ) as { rows: Array<{ id: string }> }

  const weekId = inserted.rows[0]!.id
  await ensureAssociation(queryable, weekId, projectId, 'project')
  await ensureAssociation(queryable, weekId, input.programId, 'program')
  return weekId
}

function buildValidationReviewContent(weekNumber: number) {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: `Week ${weekNumber} validation notes` }],
      },
      {
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'FleetGraph should let the reviewer validate this plan directly from the review tab.',
        }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'The review tab is visible and ready for inspection.' }],
            }],
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'Plan Validation should still be unset before the FleetGraph action runs.' }],
            }],
          },
        ],
      },
    ],
  }
}

async function ensureValidationReview(
  queryable: Queryable,
  input: FleetGraphDemoFixtureInput,
  weekId: string,
  sprintNumber: number
) {
  const existing = await queryable.query(
    `SELECT d.id
     FROM documents d
     JOIN document_associations da
       ON da.document_id = d.id
      AND da.related_id = $2
      AND da.relationship_type = 'sprint'
     WHERE d.workspace_id = $1
       AND d.document_type = 'weekly_review'`,
    [input.workspaceId, weekId]
  ) as { rows: Array<{ id: string }> }

  const properties = {
    owner_id: input.ownerUserId,
    plan_validated: null,
    sprint_id: weekId,
  }
  const content = buildValidationReviewContent(sprintNumber)
  const title = `Week ${sprintNumber} Review`

  if (existing.rows[0]?.id) {
    await queryable.query(
      `UPDATE documents
       SET title = $3,
           content = $4::jsonb,
           properties = $5::jsonb,
           updated_at = now()
       WHERE id = $1 AND workspace_id = $2`,
      [existing.rows[0].id, input.workspaceId, title, JSON.stringify(content), JSON.stringify(properties)]
    )
    await ensureAssociation(queryable, existing.rows[0].id, weekId, 'sprint')
    return existing.rows[0].id
  }

  const inserted = await queryable.query(
    `INSERT INTO documents (workspace_id, document_type, title, content, properties, created_by, visibility)
     VALUES ($1, 'weekly_review', $2, $3::jsonb, $4::jsonb, $5, 'workspace')
     RETURNING id`,
    [input.workspaceId, title, JSON.stringify(content), JSON.stringify(properties), input.ownerUserId]
  ) as { rows: Array<{ id: string }> }

  const reviewId = inserted.rows[0]!.id
  await ensureAssociation(queryable, reviewId, weekId, 'sprint')
  return reviewId
}

async function resetFindingByKey(
  queryable: Queryable,
  findingStore: ReturnType<typeof createFleetGraphFindingStore>,
  findingKey: string
) {
  const existingFinding = await findingStore.getFindingByKey(findingKey)
  if (!existingFinding) {
    return
  }

  await queryable.query(
    'DELETE FROM fleetgraph_finding_action_runs WHERE finding_id = $1',
    [existingFinding.id]
  )
  await queryable.query(
    'DELETE FROM fleetgraph_proactive_findings WHERE id = $1',
    [existingFinding.id]
  )
}

async function resetWorkerDemoProofLane(
  queryable: Queryable,
  workspaceId: string
) {
  const dedupeKey = buildFleetGraphDedupeKey({
    mode: 'proactive',
    routeSurface: 'workspace-sweep',
    trigger: 'scheduled-sweep',
    workspaceId,
  })

  await queryable.query(
    'DELETE FROM fleetgraph_queue_jobs WHERE dedupe_key = $1',
    [dedupeKey]
  )
  await queryable.query(
    'DELETE FROM fleetgraph_dedupe_ledger WHERE dedupe_key = $1',
    [dedupeKey]
  )
}

export async function ensureFleetGraphDemoProofLane(
  queryable: Queryable,
  input: FleetGraphDemoFixtureInput,
  now = new Date()
): Promise<FleetGraphDemoFixtureResult> {
  const findingStore = createFleetGraphFindingStore(queryable)
  const workerStore = createFleetGraphWorkerStore(queryable)
  const projectId = await ensureDemoProject(queryable, input)
  const weekId = await ensureDemoWeek(queryable, input, projectId, {
    plan: 'Review the visible FleetGraph finding and use the apply confirmation path.',
    sprintNumber: input.currentSprintNumber,
    status: 'planning',
    successCriteria: 'The public demo shows a visible proactive finding with Review and apply.',
    title: FLEETGRAPH_DEMO_WEEK_TITLE,
  })
  const validationWeekId = await ensureDemoWeek(queryable, input, projectId, {
    plan: 'Use the review tab to test FleetGraph plan validation on a week that is ready but not yet validated.',
    sprintNumber: input.currentSprintNumber,
    status: 'active',
    successCriteria: 'The public demo shows an unvalidated review tab where FleetGraph can validate the week plan.',
    title: FLEETGRAPH_DEMO_VALIDATION_WEEK_TITLE,
  })
  const workerWeekId = await ensureDemoWeek(queryable, input, projectId, {
    plan: 'Let the deployed FleetGraph worker generate this finding through the real proactive path.',
    sprintNumber: input.currentSprintNumber,
    status: 'planning',
    successCriteria: 'The public demo shows a worker-generated proactive finding without seeding it directly.',
    title: FLEETGRAPH_DEMO_WORKER_WEEK_TITLE,
  })
  await ensureValidationReview(
    queryable,
    input,
    validationWeekId,
    input.currentSprintNumber
  )
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
  const workerFindingKey = `week-start-drift:${input.workspaceId}:${workerWeekId}`
  await resetFindingByKey(queryable, findingStore, draft.findingKey)
  await resetFindingByKey(queryable, findingStore, workerFindingKey)
  await resetWorkerDemoProofLane(queryable, input.workspaceId)

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
      preserveDemoLane: true,
      proofLane: 'seeded-hitl',
    },
    recommendedAction: draft.recommendedAction,
    summary: draft.summary,
    threadId: `${FLEETGRAPH_DEMO_THREAD_PREFIX}:${input.workspaceId}:${weekId}`,
    title: draft.title,
    workspaceId: input.workspaceId,
  }, now)
  await workerStore.enqueue(
    {
      dedupeKey: buildFleetGraphDedupeKey({
        mode: 'proactive',
        routeSurface: 'workspace-sweep',
        trigger: 'scheduled-sweep',
        workspaceId: input.workspaceId,
      }),
      mode: 'proactive',
      routeSurface: 'workspace-sweep',
      threadId: buildFleetGraphThreadId({
        trigger: 'scheduled-sweep',
        workspaceId: input.workspaceId,
      }),
      trigger: 'scheduled-sweep',
      workspaceId: input.workspaceId,
    },
    now,
    3
  )
  await workerStore.registerWorkspaceSweep(input.workspaceId, now)

  return {
    findingTitle: draft.title,
    projectId,
    projectTitle: FLEETGRAPH_DEMO_PROJECT_TITLE,
    validationWeekId,
    validationWeekTitle: FLEETGRAPH_DEMO_VALIDATION_WEEK_TITLE,
    workerFindingTitle: FLEETGRAPH_DEMO_WORKER_FINDING_TITLE,
    workerWeekId,
    workerWeekTitle: FLEETGRAPH_DEMO_WORKER_WEEK_TITLE,
    weekId,
    weekTitle: FLEETGRAPH_DEMO_WEEK_TITLE,
  }
}
