import type { Request } from 'express'

import { buildEmptyDialogSubmission, actionDraftFromRequestedAction } from './drafts.js'
import { ensureFirstPackActionsRegistered } from './definitions/index.js'
import { getActionDefinition } from './registry.js'
import {
  buildShipRestRequestContext,
} from './executor.js'
import {
  ActionExecutionService,
  type ActionExecutionContext,
} from './execution-service.js'
import { createFleetGraphFindingActionStore } from './store.js'
import type {
  FleetGraphFindingActionExecutionRecord,
  FleetGraphFindingActionStore,
} from './types.js'
import {
  createFleetGraphFindingStore,
  type FleetGraphFindingRecord,
  type FleetGraphFindingStore,
} from '../findings/index.js'

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
  actionId: string
) {
  return [
    'fleetgraph',
    finding.workspaceId,
    'finding-review',
    finding.id,
    actionId,
  ].join(':')
}

function ensureApplicableFinding(
  finding: FleetGraphFindingRecord | null
) {
  if (!finding) {
    throw new FleetGraphFindingActionError('FleetGraph finding not found', 404)
  }

  if (finding.status !== 'active') {
    throw new FleetGraphFindingActionError(
      'Only active FleetGraph findings can be applied.',
      409
    )
  }

  const action = finding.recommendedAction
  const actionDraft = action ? actionDraftFromRequestedAction(action) : undefined
  if (!action || !actionDraft) {
    throw new FleetGraphFindingActionError(
      'This FleetGraph finding does not expose a valid action.',
      400
    )
  }

  return { actionDraft, finding }
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

  return mapExecutions(
    [await findingStore.getFindingById(finding.id, finding.workspaceId).then((result) => result ?? finding)],
    executions,
  )[0] as FleetGraphFindingWithExecution
}

function buildExecutionContext(
  request: Pick<Request, 'get' | 'header' | 'protocol'>
): ActionExecutionContext {
  const requestContext = buildShipRestRequestContext(request)

  return {
    async shipRequest(method, path, body) {
      const response = await fetch(`${requestContext.baseUrl}${path}`, {
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          ...(requestContext.cookieHeader ? { cookie: requestContext.cookieHeader } : {}),
          ...(requestContext.csrfToken ? { 'x-csrf-token': requestContext.csrfToken } : {}),
          accept: 'application/json',
          'content-type': 'application/json',
        },
        method,
      })

      return {
        json: async () => response.json(),
        ok: response.ok,
        status: response.status,
      }
    },
  }
}

export function createFleetGraphFindingActionService(
  deps: FleetGraphFindingActionServiceDeps = {}
) {
  ensureFirstPackActionsRegistered()

  const findingStore = deps.findingStore ?? createFleetGraphFindingStore()
  const actionStore = deps.actionStore ?? createFleetGraphFindingActionStore()

  return {
    async reviewStartWeekFinding(
      input: ReviewFindingActionInput
    ): Promise<{ finding: FleetGraphFindingWithExecution; review: FleetGraphFindingActionReview }> {
      const { actionDraft, finding } = ensureApplicableFinding(
        await findingStore.getFindingById(input.findingId, input.workspaceId)
      )

      const review = new ActionExecutionService({
        shipRequest: async () => ({
          json: async () => ({}),
          ok: true,
          status: 200,
        }),
      })
      const response = await review.review({
        actionId: actionDraft.actionId,
        draft: actionDraft,
        workspaceId: input.workspaceId,
      })

      return {
        finding: await hydrateFinding(actionStore, findingStore, finding),
        review: {
          cancelLabel: response.dialogSpec.cancelLabel,
          confirmLabel: response.dialogSpec.confirmLabel,
          evidence: response.dialogSpec.evidence,
          summary: response.dialogSpec.summary,
          threadId: buildActionThreadId(finding, actionDraft.actionId),
          title: response.dialogSpec.title,
        },
      }
    },

    async applyStartWeekFinding(
      input: ApplyFindingActionInput
    ): Promise<FleetGraphFindingWithExecution> {
      const { actionDraft, finding } = ensureApplicableFinding(
        await findingStore.getFindingById(input.findingId, input.workspaceId)
      )

      const executionService = new ActionExecutionService(
        buildExecutionContext(input.request)
      )
      const review = await executionService.review({
        actionId: actionDraft.actionId,
        draft: actionDraft,
        workspaceId: input.workspaceId,
      })
      const submission = buildEmptyDialogSubmission(actionDraft.actionId)
      const definition = getActionDefinition(actionDraft.actionType)
      const executionPlan = definition?.buildExecutionPlan(actionDraft, submission)
      const firstEndpoint = executionPlan?.endpoints[0]
      if (firstEndpoint) {
        const begin = await actionStore.beginExecution({
          actionType: actionDraft.actionType,
          endpoint: {
            method: firstEndpoint.method,
            path: firstEndpoint.path,
          },
          findingId: finding.id,
          workspaceId: finding.workspaceId,
        })

        if (begin.shouldExecute) {
          const plan = await executionService.apply({
            actionId: actionDraft.actionId,
            draft: actionDraft,
            submission,
            workspaceId: input.workspaceId,
          })
          const firstResult = plan.results[0]
          await actionStore.finishExecution({
            actionType: actionDraft.actionType,
            appliedAt: firstResult?.status === 'success' ? new Date() : undefined,
            endpoint: {
              method: firstEndpoint.method,
              path: firstEndpoint.path,
            },
            findingId: finding.id,
            message: firstResult?.status === 'success'
              ? review.dialogSpec.summary
              : (firstResult?.error ?? 'FleetGraph action failed.'),
            resultStatusCode: firstResult?.statusCode,
            status: firstResult?.status === 'success' ? 'applied' : 'failed',
            workspaceId: finding.workspaceId,
          })

          if (plan.status === 'applied') {
            await findingStore.resolveFinding(finding.findingKey)
          }
        } else if (begin.execution?.status === 'applied' || begin.execution?.status === 'already_applied') {
          await findingStore.resolveFinding(finding.findingKey)
        }
      }

      return hydrateFinding(actionStore, findingStore, finding)
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
