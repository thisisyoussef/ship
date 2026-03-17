import type { Request } from 'express'

import {
  resolveShipRestBaseUrl,
  type ShipRestRequestContext,
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
  findingId: string
  request: Pick<Request, 'get' | 'header' | 'protocol'>
  workspaceId: string
}

interface ReviewFindingActionInput {
  findingId: string
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

function buildActionThreadId(finding: FleetGraphFindingRecord) {
  return [
    'fleetgraph',
    finding.workspaceId,
    'finding-review',
    finding.id,
    'start-week',
  ].join(':')
}

function buildRequestContext(
  request: Pick<Request, 'get' | 'header' | 'protocol'>
): ShipRestRequestContext {
  return {
    baseUrl: resolveShipRestBaseUrl(request),
    cookieHeader: request.header('cookie') ?? undefined,
    csrfToken: request.header('x-csrf-token') ?? undefined,
  }
}

function buildReview(finding: FleetGraphFindingRecord) {
  return {
    cancelLabel: 'Cancel',
    confirmLabel: 'Start week in Ship',
    evidence: finding.recommendedAction?.evidence ?? [],
    summary: finding.recommendedAction?.summary
      ?? 'Review this recommendation before making a Ship change.',
    threadId: buildActionThreadId(finding),
    title: finding.recommendedAction?.title ?? 'Start week',
  } satisfies FleetGraphFindingActionReview
}

function ensureApplicableFinding(finding: FleetGraphFindingRecord | null) {
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
  if (!action || action.type !== 'start_week' || action.endpoint.method !== 'POST') {
    throw new FleetGraphFindingActionError(
      'This FleetGraph finding does not expose a valid start-week action.',
      400
    )
  }

  return finding
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

  return mapExecutions([finding], executions)[0] as FleetGraphFindingWithExecution
}

async function ensurePendingReview(
  runtime: FleetGraphRuntime,
  finding: FleetGraphFindingRecord
) {
  const threadId = buildActionThreadId(finding)
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
    requestedAction: finding.recommendedAction,
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
    async reviewStartWeekFinding(
      input: ReviewFindingActionInput
    ): Promise<{ finding: FleetGraphFindingWithExecution; review: FleetGraphFindingActionReview }> {
      const finding = ensureApplicableFinding(
        await findingStore.getFindingById(input.findingId, input.workspaceId)
      )
      await ensurePendingReview(runtime, finding)

      return {
        finding: await hydrateFinding(actionStore, findingStore, finding),
        review: buildReview(finding),
      }
    },

    async applyStartWeekFinding(
      input: ApplyFindingActionInput
    ): Promise<FleetGraphFindingWithExecution> {
      const finding = ensureApplicableFinding(
        await findingStore.getFindingById(input.findingId, input.workspaceId)
      )
      const threadId = await ensurePendingReview(runtime, finding)

      await runtime.resume(
        threadId,
        'approved',
        {
          fleetgraphActionRequestContext: buildRequestContext(input.request),
        }
      )

      const refreshed = ensureApplicableFinding(
        await findingStore.getFindingById(input.findingId, input.workspaceId)
      )

      return hydrateFinding(actionStore, findingStore, refreshed)
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
