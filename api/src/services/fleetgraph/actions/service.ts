import type { Request } from 'express'

import {
  buildShipRestRequestContext,
} from './executor.js'
import {
  createFleetGraphFindingActionStore,
} from './store.js'
import type {
  FleetGraphFindingActionExecutionRecord,
  FleetGraphFindingActionStore,
} from './types.js'
import {
  createFleetGraphFindingStore,
  type FleetGraphFindingRecord,
  type FleetGraphFindingStore,
} from '../findings/index.js'
import {
  createFleetGraphRuntime,
  type FleetGraphRuntime,
} from '../graph/index.js'

export class FleetGraphFindingActionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message)
    this.name = 'FleetGraphFindingActionError'
  }
}

interface ApplyFindingActionInput {
  assigneeId?: string
  actorUserId: string
  findingId: string
  ownerId?: string
  request: Pick<Request, 'get' | 'header' | 'protocol'>
  workspaceId: string
}

interface ReviewFindingActionInput {
  assigneeId?: string
  actorUserId: string
  findingId: string
  ownerId?: string
  workspaceId: string
}

export interface FleetGraphFindingActionReview {
  cancelLabel: string
  confirmLabel: string
  evidence: string[]
  summary: string
  threadId: string
  title: string
}

interface FleetGraphFindingWithExecution extends FleetGraphFindingRecord {
  actionExecution?: FleetGraphFindingActionExecutionRecord
}

interface FleetGraphFindingActionServiceDeps {
  actionStore?: FleetGraphFindingActionStore
  findingStore?: FleetGraphFindingStore
  runtime?: FleetGraphRuntime
}

type ReviewableFindingAction =
  NonNullable<FleetGraphFindingRecord['recommendedAction']> & {
    type: 'assign_issues' | 'assign_owner' | 'start_week'
  }

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function readIssueIds(action: ReviewableFindingAction) {
  if (action.type !== 'assign_issues') {
    return []
  }

  const issueIds = action.body?.issue_ids
  if (isStringArray(issueIds)) {
    return issueIds
  }

  const ids = action.body?.ids
  return isStringArray(ids) ? ids : []
}

function mapExecutions(
  findings: FleetGraphFindingRecord[],
  executions: FleetGraphFindingActionExecutionRecord[]
) {
  const byFindingId = new Map(
    executions.map((execution) => [execution.findingId, execution])
  )

  return findings.map((finding) => ({
    ...finding,
    actionExecution: byFindingId.get(finding.id),
  }))
}

function buildActionThreadId(
  finding: FleetGraphFindingRecord,
  action: ReviewableFindingAction
) {
  const actionScope = action.type === 'assign_owner'
    ? [
        'assign-owner',
        typeof action.body?.owner_id === 'string'
          ? action.body.owner_id.replaceAll(':', '-')
          : 'selected-owner',
      ].join(':')
    : action.type === 'assign_issues'
      ? [
          'assign-issues',
          typeof action.body?.updates === 'object'
            && action.body?.updates !== null
            && typeof (action.body.updates as Record<string, unknown>).assignee_id === 'string'
            ? String((action.body.updates as Record<string, unknown>).assignee_id).replaceAll(':', '-')
            : 'selected-assignee',
        ].join(':')
      : 'start-week'

  return [
    'fleetgraph',
    finding.workspaceId,
    'finding-review',
    finding.id,
    actionScope,
  ].join(':')
}

function buildReview(
  finding: FleetGraphFindingRecord,
  action: ReviewableFindingAction
) {
  if (action.type === 'assign_owner') {
    return {
      cancelLabel: 'Cancel',
      confirmLabel: 'Assign owner in Ship',
      evidence: [
        ...action.evidence,
        'FleetGraph will assign the person you selected in Ship when you confirm.',
      ],
      summary: 'FleetGraph will assign the person you selected in Ship so someone is explicitly accountable for coordination and follow-through.',
      threadId: buildActionThreadId(finding, action),
      title: 'Confirm before assigning sprint owner',
    } satisfies FleetGraphFindingActionReview
  }

  if (action.type === 'assign_issues') {
    return {
      cancelLabel: 'Cancel',
      confirmLabel: 'Assign issues in Ship',
      evidence: [
        ...action.evidence,
        'FleetGraph will assign the currently unassigned sprint issues to the person you selected in Ship when you confirm.',
      ],
      summary: 'FleetGraph will assign the currently unassigned sprint issues to the person you selected in Ship so execution has a clear owner.',
      threadId: buildActionThreadId(finding, action),
      title: 'Confirm before assigning sprint issues',
    } satisfies FleetGraphFindingActionReview
  }

  return {
    cancelLabel: 'Cancel',
    confirmLabel: 'Start week in Ship',
    evidence: action.evidence,
    summary: action.summary,
    threadId: buildActionThreadId(finding, action),
    title: action.title,
  } satisfies FleetGraphFindingActionReview
}

function isReviewableFindingAction(
  action: FleetGraphFindingRecord['recommendedAction'] | undefined
): action is ReviewableFindingAction {
  if (!action) {
    return false
  }

  if (action.type === 'start_week') {
    return action.endpoint.method === 'POST'
  }

  if (action.type === 'assign_owner') {
    return action.endpoint.method === 'PATCH'
  }

  if (action.type === 'assign_issues') {
    return action.endpoint.method === 'POST'
  }

  return false
}

function buildRequestedAction(
  action: ReviewableFindingAction,
  actorUserId: string,
  ownerId?: string,
  assigneeId?: string
): ReviewableFindingAction {
  if (action.type === 'assign_issues') {
    const selectedAssigneeId = assigneeId?.trim()
    if (!selectedAssigneeId) {
      throw new FleetGraphFindingActionError(
        'Choose the issue assignee before continuing.',
        400
      )
    }

    const issueIds = readIssueIds(action)
    if (issueIds.length === 0) {
      throw new FleetGraphFindingActionError(
        'FleetGraph could not determine which sprint issues to assign.',
        400
      )
    }

    return {
      ...action,
      body: {
        ...(action.body ?? {}),
        action: 'update',
        ids: issueIds,
        issue_ids: issueIds,
        updates: {
          assignee_id: selectedAssigneeId,
        },
      },
    }
  }

  if (action.type !== 'assign_owner') {
    return action
  }

  const selectedOwnerId = ownerId
    ?? (typeof action.body?.owner_id === 'string' ? action.body.owner_id : actorUserId)

  return {
    ...action,
    body: {
      ...(action.body ?? {}),
      owner_id: selectedOwnerId,
    },
  }
}

function ensureApplicableFinding(
  finding: FleetGraphFindingRecord | null,
  actorUserId: string,
  ownerId?: string,
  assigneeId?: string
) {
  if (!finding) {
    throw new FleetGraphFindingActionError(
      'FleetGraph finding not found',
      404
    )
  }

  if (finding.status !== 'active') {
    throw new FleetGraphFindingActionError(
      'Only active FleetGraph findings can be applied.',
      409
    )
  }

  const action = finding.recommendedAction
  if (!isReviewableFindingAction(action)) {
    throw new FleetGraphFindingActionError(
      'This FleetGraph finding does not expose a valid FleetGraph review/apply action.',
      400
    )
  }

  return {
    finding,
    requestedAction: buildRequestedAction(action, actorUserId, ownerId, assigneeId),
  }
}

async function hydrateFinding(
  actionStore: FleetGraphFindingActionStore,
  findingStore: FleetGraphFindingStore,
  finding: FleetGraphFindingRecord
): Promise<FleetGraphFindingWithExecution> {
  const executions = await actionStore.listExecutionsForFindings(
    finding.workspaceId,
    [finding.id]
  )

  const latestFinding = await findingStore.getFindingById(
    finding.id,
    finding.workspaceId
  )

  return mapExecutions(
    [latestFinding ?? finding],
    executions
  )[0] as FleetGraphFindingWithExecution
}

async function ensurePendingReview(
  runtime: FleetGraphRuntime,
  finding: FleetGraphFindingRecord,
  requestedAction: ReviewableFindingAction
) {
  const threadId = buildActionThreadId(finding, requestedAction)
  const pendingInterrupts = await runtime.getPendingInterrupts(threadId)
    .catch(() => [])

  if (pendingInterrupts.length > 0) {
    return threadId
  }

  await runtime.invoke({
    contextKind: 'finding_review',
    documentId: finding.documentId,
    documentType: finding.documentType,
    findingId: finding.id,
    mode: 'on_demand',
    requestedAction,
    routeSurface: 'document-page',
    threadId,
    trigger: 'human-review',
    workspaceId: finding.workspaceId,
  })

  return threadId
}

export function createFleetGraphFindingActionService(
  deps: FleetGraphFindingActionServiceDeps = {}
) {
  const findingStore = deps.findingStore ?? createFleetGraphFindingStore()
  const actionStore = deps.actionStore ?? createFleetGraphFindingActionStore()
  const runtime = deps.runtime ?? createFleetGraphRuntime({
    actionStore,
    findingStore,
  })

  return {
    async reviewFinding(
      input: ReviewFindingActionInput
    ): Promise<{ finding: FleetGraphFindingWithExecution; review: FleetGraphFindingActionReview }> {
      const { finding, requestedAction } = ensureApplicableFinding(
        await findingStore.getFindingById(input.findingId, input.workspaceId),
        input.actorUserId,
        input.ownerId,
        input.assigneeId
      )
      await ensurePendingReview(runtime, finding, requestedAction)

      return {
        finding: await hydrateFinding(actionStore, findingStore, finding),
        review: buildReview(finding, requestedAction),
      }
    },

    async applyFinding(
      input: ApplyFindingActionInput
    ): Promise<FleetGraphFindingWithExecution> {
      const { finding, requestedAction } = ensureApplicableFinding(
        await findingStore.getFindingById(input.findingId, input.workspaceId),
        input.actorUserId,
        input.ownerId,
        input.assigneeId
      )
      const threadId = await ensurePendingReview(runtime, finding, requestedAction)

      await runtime.resume(
        threadId,
        'approved',
        {
          fleetgraphActionRequestContext: buildShipRestRequestContext(input.request),
        }
      )

      const hydrated = await hydrateFinding(actionStore, findingStore, finding)

      if (
        (requestedAction.type === 'assign_owner'
          || requestedAction.type === 'assign_issues')
        && hydrated.actionExecution?.status === 'applied'
      ) {
        const resolved = await findingStore.resolveFinding(finding.findingKey)
        if (resolved) {
          return hydrateFinding(actionStore, findingStore, resolved)
        }
      }

      return hydrated
    },

    async attachExecutions(
      findings: FleetGraphFindingRecord[],
      workspaceId: string
    ): Promise<FleetGraphFindingWithExecution[]> {
      const executions = await actionStore.listExecutionsForFindings(
        workspaceId,
        findings.map((finding) => finding.id)
      )

      return mapExecutions(findings, executions)
    },
  }
}
