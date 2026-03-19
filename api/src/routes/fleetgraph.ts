import { MemorySaver } from '@langchain/langgraph'
import { Router, type Request, type Response } from 'express'
import { ZodError } from 'zod'

import {
  createFleetGraphFindingActionService,
  createFleetGraphFindingActionStore,
  createFleetGraphOnDemandActionService,
  buildShipRestRequestContext,
  FleetGraphFindingActionError,
  FleetGraphOnDemandActionError,
  type FleetGraphActionDraft,
  type FleetGraphDialogSubmission,
  type FleetGraphFindingActionExecutionRecord,
  type FleetGraphFindingActionReview,
} from '../services/fleetgraph/actions/index.js'
import {
  buildFleetGraphEvidenceChecklist,
  FleetGraphDeploymentReadinessResponseSchema,
  isFleetGraphServiceAuthorized,
  isSurfaceEnabled,
  resolveFleetGraphSurfaceReadiness,
  resolveFleetGraphV2Readiness,
} from '../services/fleetgraph/deployment/index.js'
import {
  createFleetGraphFindingStore,
  FleetGraphFindingLifecycleResponseSchema,
  FleetGraphFindingListResponseSchema,
  FleetGraphSnoozeRequestSchema,
  type FleetGraphFindingRecord,
} from '../services/fleetgraph/findings/index.js'
import {
  createFleetGraphV2Runtime,
  type FleetGraphStateV2,
  type FleetGraphV2Runtime,
  type FleetGraphV2RuntimeInput,
  type ResponsePayload,
  parseFleetGraphV2ResumeInput,
} from '../services/fleetgraph/graph/index.js'
import {
  createLLMAdapter,
  resolveLLMConfig,
} from '../services/fleetgraph/llm/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAuthContext } from './route-helpers.js'

type RouterType = ReturnType<typeof Router>

interface FleetGraphRouterDeps {
  actionService?: ReturnType<typeof createFleetGraphFindingActionService>
  findingStore?: ReturnType<typeof createFleetGraphFindingStore>
  onDemandActionService?: ReturnType<typeof createFleetGraphOnDemandActionService>
  runtimeV2?: FleetGraphV2Runtime
}

function readServiceToken(request: Request) {
  const headerToken = request.header('x-fleetgraph-service-token')
  if (headerToken) {
    return headerToken
  }

  const authorization = request.header('authorization')
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length)
  }

  return undefined
}

function serializeActionExecution(
  execution?: FleetGraphFindingActionExecutionRecord
) {
  if (!execution) {
    return undefined
  }

  return {
    actionType: execution.actionType,
    appliedAt: execution.appliedAt?.toISOString(),
    attemptCount: execution.attemptCount,
    endpoint: execution.endpoint,
    findingId: execution.findingId,
    message: execution.message,
    resultStatusCode: execution.resultStatusCode,
    status: execution.status,
    updatedAt: execution.updatedAt.toISOString(),
  }
}

function serializeFinding(finding: FleetGraphFindingRecord) {
  return {
    actionExecution: serializeActionExecution(finding.actionExecution),
    cooldownUntil: finding.cooldownUntil?.toISOString(),
    dedupeKey: finding.dedupeKey,
    documentId: finding.documentId,
    documentType: finding.documentType,
    evidence: finding.evidence,
    findingKey: finding.findingKey,
    findingType: finding.findingType,
    id: finding.id,
    metadata: finding.metadata,
    recommendedAction: finding.recommendedAction,
    snoozedUntil: finding.snoozedUntil?.toISOString(),
    status: finding.status,
    summary: finding.summary,
    threadId: finding.threadId,
    title: finding.title,
    tracePublicUrl: finding.tracePublicUrl,
    traceRunId: finding.traceRunId,
    updatedAt: finding.updatedAt.toISOString(),
    workspaceId: finding.workspaceId,
  }
}

function serializeReview(review: FleetGraphFindingActionReview) {
  return {
    cancelLabel: review.cancelLabel,
    confirmLabel: review.confirmLabel,
    evidence: review.evidence,
    summary: review.summary,
    threadId: review.threadId,
    title: review.title,
  }
}

function serializeCheckpoint(
  snapshot: Awaited<ReturnType<FleetGraphV2Runtime['getCheckpointHistory']>>[number]
) {
  return {
    branch: snapshot.values.branch,
    createdAt: snapshot.createdAt,
    next: snapshot.next,
    outcome: snapshot.values.branch,
    path: snapshot.values.path ?? [],
    taskCount: snapshot.tasks.length,
    threadId: snapshot.config.configurable?.thread_id,
  }
}

function readDocumentIds(request: Request) {
  const values = typeof request.query.documentIds === 'string'
    ? request.query.documentIds.split(',')
    : typeof request.query.documentId === 'string'
      ? [request.query.documentId]
      : []

  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  )
}

function buildDefaultResponsePayload(
  state: FleetGraphStateV2
): ResponsePayload {
  if (state.branch === 'action_required') {
    return {
      type: 'chat_answer',
      answer: {
        entityLinks: [],
        suggestedNextSteps: state.actionDrafts.map((draft) => draft.actionType),
        text: state.analysisNarrative
          ?? 'FleetGraph found a change worth reviewing before it applies anything in Ship.',
      },
    }
  }

  return {
    type: 'chat_answer',
    answer: {
      entityLinks: [],
      suggestedNextSteps: [],
      text: `I analyzed this ${state.documentType ?? 'document'} and did not find anything that needs immediate attention.`,
    },
  }
}

function readPendingApprovalFromInterrupts(
  state: FleetGraphStateV2,
  interrupts: Awaited<ReturnType<FleetGraphV2Runtime['getPendingInterrupts']>>
) {
  const approvalInterrupt = interrupts.find((item) =>
    item.taskName === 'approval_interrupt'
    && item.value
    && typeof item.value === 'object'
    && (item.value as { type?: string }).type === 'approval_request'
  )

  if (!approvalInterrupt?.value || typeof approvalInterrupt.value !== 'object') {
    return state.pendingApproval ?? null
  }

  const payload = approvalInterrupt.value as {
    actionDraft?: FleetGraphActionDraft
    dialogSpec?: unknown
    id?: string
    summary?: string
    title?: string
    validationError?: string
  }

  return {
    actionDraft: payload.actionDraft ?? null,
    dialogSpec: payload.dialogSpec ?? null,
    id: payload.id,
    summary: payload.summary,
    title: payload.title,
    validationError: payload.validationError,
  }
}

async function serializeNativeState(
  runtime: FleetGraphV2Runtime,
  threadId: string,
  state: FleetGraphStateV2
) {
  const pendingApproval = readPendingApprovalFromInterrupts(
    state,
    await runtime.getPendingInterrupts(threadId).catch(() => [])
  )

  return {
    actionDrafts: state.actionDrafts,
    branch: state.branch,
    contextSummary: state.contextSummary,
    path: state.path,
    pendingApproval,
    reasonedFindings: state.reasonedFindings ?? [],
    responsePayload: state.responsePayload ?? buildDefaultResponsePayload(state),
    threadId,
    turnCount: state.turnCount,
  }
}

function buildAnalyzeInput(
  auth: NonNullable<ReturnType<typeof getAuthContext>>,
  threadId: string,
  params: {
    activeTab?: string | null
    documentId: string
    documentType: string
    nestedPath?: string | null
    selectedActionId?: string | null
    triggerSource: string
    userQuestion?: string | null
  }
): FleetGraphV2RuntimeInput {
  return {
    activeTab: params.activeTab ?? null,
    actorId: auth.userId ?? null,
    dirtyCoalescedIds: [],
    dirtyEntityId: null,
    dirtyEntityType: null,
    dirtyWriteType: null,
    documentId: params.documentId,
    documentType: params.documentType as FleetGraphV2RuntimeInput['documentType'],
    mode: 'on_demand',
    nestedPath: params.nestedPath ?? null,
    projectContextId: null,
    selectedActionId: params.selectedActionId ?? null,
    threadId,
    triggerSource: params.triggerSource,
    triggerType: 'user_chat',
    userQuestion: params.userQuestion ?? null,
    viewerUserId: auth.userId ?? null,
    workspaceId: auth.workspaceId,
  }
}

export function createFleetGraphRouter(
  deps: FleetGraphRouterDeps = {}
) {
  const findingStore = deps.findingStore ?? createFleetGraphFindingStore()
  const actionStore = createFleetGraphFindingActionStore()
  const actionService = deps.actionService ?? createFleetGraphFindingActionService({
    actionStore,
    findingStore,
  })
  const sharedCheckpointer = new MemorySaver()
  let llm: ReturnType<typeof createLLMAdapter> | undefined
  try {
    const llmConfig = resolveLLMConfig(process.env)
    llm = llmConfig ? createLLMAdapter(llmConfig) : undefined
  } catch {
    llm = undefined
  }

  function getV2Runtime(req: Request): FleetGraphV2Runtime {
    if (deps.runtimeV2) {
      return deps.runtimeV2
    }

    const baseUrl = process.env.SHIP_API_BASE_URL || `${req.protocol}://${req.get('host')}`
    const token = process.env.FLEETGRAPH_SERVICE_TOKEN || ''

    return createFleetGraphV2Runtime({
      actionStore,
      checkpointer: sharedCheckpointer,
      fetchConfig: {
        baseUrl,
        requestContext: buildShipRestRequestContext(req),
        token,
      },
      findingStore,
      llm,
    })
  }

  function getOnDemandActionService(req: Request) {
    return deps.onDemandActionService ?? createFleetGraphOnDemandActionService({
      runtime: getV2Runtime(req),
    })
  }

  const router: RouterType = Router()

  router.get('/ready', async (req: Request, res: Response) => {
    if (!isFleetGraphServiceAuthorized(readServiceToken(req))) {
      res.status(403).json({ error: 'FleetGraph service authorization failed' })
      return
    }

    const api = resolveFleetGraphSurfaceReadiness('api')
    const worker = resolveFleetGraphSurfaceReadiness('worker')
    const v2 = resolveFleetGraphV2Readiness()

    res.status(api.ready && worker.ready ? 200 : 503).json({
      ...FleetGraphDeploymentReadinessResponseSchema.parse({
        api,
        checklist: buildFleetGraphEvidenceChecklist({ api, worker }, {}),
        worker,
      }),
      v2,
    })
  })

  router.post('/entry', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    if (!isSurfaceEnabled('api')) {
      res.status(503).json({ error: 'FleetGraph entry is not enabled in this environment' })
      return
    }

    try {
      const body = req.body as {
        context?: { current?: { document_type?: string; id?: string; title?: string } }
        route?: { activeTab?: string; nestedPath?: string[]; surface?: string }
        trigger?: { documentId?: string; documentType?: string }
      }

      const documentId = body.trigger?.documentId ?? body.context?.current?.id
      const documentType = body.trigger?.documentType ?? body.context?.current?.document_type
      if (!documentId || !documentType) {
        res.status(400).json({ error: 'documentId and documentType are required' })
        return
      }

      const threadId = `fleetgraph:${auth.workspaceId}:entry:${documentId}:${Date.now()}`
      const runtime = getV2Runtime(req)
      const state = await runtime.invoke(
        buildAnalyzeInput(auth, threadId, {
          activeTab: body.route?.activeTab ?? null,
          documentId,
          documentType,
          nestedPath: body.route?.nestedPath?.join('/') ?? null,
          triggerSource: body.route?.surface ?? 'document-page',
          userQuestion: null,
        }),
        { threadId }
      )

      res.json({
        entry: {
          current: {
            documentType,
            id: documentId,
            title: body.context?.current?.title ?? 'Untitled',
          },
          route: {
            activeTab: body.route?.activeTab,
            nestedPath: body.route?.nestedPath ?? [],
            surface: body.route?.surface ?? 'document-page',
          },
          threadId,
        },
        ...(await serializeNativeState(runtime, threadId, state)),
      })
    } catch (error) {
      console.error('FleetGraph entry error:', error)
      res.status(500).json({ error: 'Failed to create FleetGraph entry' })
    }
  })

  router.get('/findings', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const findings = await findingStore.listActiveFindings({
        documentIds: readDocumentIds(req),
        workspaceId: auth.workspaceId,
      })
      const findingsWithExecutions = await actionService.attachExecutions(
        findings,
        auth.workspaceId,
      )

      res.json(FleetGraphFindingListResponseSchema.parse({
        findings: findingsWithExecutions.map(serializeFinding),
      }))
    } catch (error) {
      console.error('FleetGraph findings list error:', error)
      res.status(500).json({ error: 'Failed to load FleetGraph findings' })
    }
  })

  router.get('/debug/threads', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    const threadIds = typeof req.query.threadIds === 'string'
      ? req.query.threadIds.split(',').map((value) => value.trim()).filter(Boolean)
      : []

    try {
      const runtime = getV2Runtime(req)
      const threads = await Promise.all(
        threadIds.map(async (threadId) => {
          const [history, pendingInterrupts] = await Promise.all([
            runtime.getCheckpointHistory(threadId),
            runtime.getPendingInterrupts(threadId),
          ])

          return {
            checkpoints: history.map(serializeCheckpoint),
            pendingInterrupts,
            threadId,
          }
        })
      )

      res.json({ threads })
    } catch (error) {
      console.error('FleetGraph debug thread error:', error)
      res.status(500).json({ error: 'Failed to load FleetGraph debug threads' })
    }
  })

  router.post('/findings/:id/dismiss', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const finding = await findingStore.dismissFinding(
        String(req.params.id),
        auth.workspaceId,
      )

      if (!finding) {
        res.status(404).json({ error: 'FleetGraph finding not found' })
        return
      }

      const [findingWithExecution] = await actionService.attachExecutions(
        [finding],
        auth.workspaceId,
      )
      if (!findingWithExecution) {
        throw new Error('FleetGraph finding execution hydration failed after dismiss.')
      }

      res.json(FleetGraphFindingLifecycleResponseSchema.parse({
        finding: serializeFinding(findingWithExecution),
      }))
    } catch (error) {
      console.error('FleetGraph dismiss error:', error)
      res.status(500).json({ error: 'Failed to dismiss FleetGraph finding' })
    }
  })

  router.post('/findings/:id/review', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const response = await actionService.reviewStartWeekFinding({
        findingId: String(req.params.id),
        workspaceId: auth.workspaceId,
      })

      res.json({
        finding: serializeFinding(response.finding),
        review: serializeReview(response.review),
      })
    } catch (error) {
      if (error instanceof FleetGraphFindingActionError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      console.error('FleetGraph review error:', error)
      res.status(500).json({ error: 'Failed to prepare FleetGraph review' })
    }
  })

  router.post('/findings/:id/snooze', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const body = FleetGraphSnoozeRequestSchema.parse(req.body ?? {})
      const durationMs = body.seconds !== undefined
        ? body.seconds * 1_000
        : (body.minutes ?? 240) * 60_000
      const finding = await findingStore.snoozeFinding(
        String(req.params.id),
        auth.workspaceId,
        new Date(Date.now() + durationMs),
      )

      if (!finding) {
        res.status(404).json({ error: 'FleetGraph finding not found' })
        return
      }

      const [findingWithExecution] = await actionService.attachExecutions(
        [finding],
        auth.workspaceId,
      )
      if (!findingWithExecution) {
        throw new Error('FleetGraph finding execution hydration failed after snooze.')
      }

      res.json(FleetGraphFindingLifecycleResponseSchema.parse({
        finding: serializeFinding(findingWithExecution),
      }))
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid FleetGraph snooze payload' })
        return
      }

      console.error('FleetGraph snooze error:', error)
      res.status(500).json({ error: 'Failed to snooze FleetGraph finding' })
    }
  })

  router.post('/findings/:id/apply', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const finding = await actionService.applyStartWeekFinding({
        findingId: String(req.params.id),
        request: req,
        workspaceId: auth.workspaceId,
      })

      res.json(FleetGraphFindingLifecycleResponseSchema.parse({
        finding: serializeFinding(finding),
      }))
    } catch (error) {
      if (error instanceof FleetGraphFindingActionError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      console.error('FleetGraph apply error:', error)
      res.status(500).json({ error: 'Failed to apply FleetGraph finding' })
    }
  })

  router.post('/thread/:threadId/actions/:actionId/review', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const response = await getOnDemandActionService(req).reviewThreadAction({
        actionId: String(req.params.actionId),
        threadId: String(req.params.threadId),
        workspaceId: auth.workspaceId,
      })

      res.json(response)
    } catch (error) {
      if (error instanceof FleetGraphOnDemandActionError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      console.error('FleetGraph on-demand review error:', error)
      res.status(500).json({ error: 'Failed to prepare FleetGraph action review' })
    }
  })

  router.post('/thread/:threadId/actions/:actionId/apply', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const body = req.body as {
        dialogSubmission?: { values?: FleetGraphDialogSubmission['values'] }
        values?: FleetGraphDialogSubmission['values']
      }

      const response = await getOnDemandActionService(req).applyThreadAction({
        actionId: String(req.params.actionId),
        submission: body.values ?? body.dialogSubmission?.values,
        threadId: String(req.params.threadId),
        workspaceId: auth.workspaceId,
      })

      res.json(response)
    } catch (error) {
      if (error instanceof FleetGraphOnDemandActionError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      console.error('FleetGraph on-demand apply error:', error)
      res.status(500).json({ error: 'Failed to apply FleetGraph action' })
    }
  })

  router.post('/v2/invoke', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const body = req.body as Partial<FleetGraphV2RuntimeInput>
      if (!body.triggerType) {
        res.status(400).json({ error: 'triggerType is required (sweep, user_chat, or enqueue)' })
        return
      }

      const threadId = body.threadId ?? `fleetgraph:${auth.workspaceId}:v2:${body.triggerType}:${Date.now()}`
      const runtime = getV2Runtime(req)
      const state = await runtime.invoke({
        activeTab: body.activeTab ?? null,
        actorId: body.actorId ?? auth.userId ?? null,
        dirtyCoalescedIds: body.dirtyCoalescedIds ?? [],
        dirtyEntityId: body.dirtyEntityId ?? null,
        dirtyEntityType: body.dirtyEntityType ?? null,
        dirtyWriteType: body.dirtyWriteType ?? null,
        documentId: body.documentId ?? null,
        documentType: body.documentType ?? null,
        mode: body.mode ?? (body.triggerType === 'sweep'
          ? 'proactive'
          : body.triggerType === 'enqueue'
            ? 'event_driven'
            : 'on_demand'),
        nestedPath: body.nestedPath ?? null,
        projectContextId: body.projectContextId ?? null,
        selectedActionId: body.selectedActionId ?? null,
        threadId,
        triggerSource: body.triggerSource ?? 'api',
        triggerType: body.triggerType,
        userQuestion: body.userQuestion ?? null,
        viewerUserId: body.viewerUserId ?? auth.userId ?? null,
        workspaceId: auth.workspaceId,
      }, { threadId })

      res.json(await serializeNativeState(runtime, threadId, state))
    } catch (error) {
      console.error('FleetGraph V2 invoke error:', error)
      res.status(500).json({ error: 'Failed to invoke FleetGraph V2' })
    }
  })

  router.post('/v2/resume/:threadId', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const threadId = String(req.params.threadId)
      const runtime = getV2Runtime(req)
      const state = await runtime.resume(threadId, parseFleetGraphV2ResumeInput(req.body ?? {}))
      res.json(await serializeNativeState(runtime, threadId, state))
    } catch (error) {
      console.error('FleetGraph V2 resume error:', error)
      res.status(500).json({ error: 'Failed to resume FleetGraph V2' })
    }
  })

  router.get('/v2/state/:threadId', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const runtime = getV2Runtime(req)
      const snapshot = await runtime.getState(String(req.params.threadId))

      res.json({
        tasks: snapshot.tasks,
        threadId: String(req.params.threadId),
        values: snapshot.values,
      })
    } catch (error) {
      console.error('FleetGraph V2 state error:', error)
      res.status(500).json({ error: 'Failed to get FleetGraph V2 state' })
    }
  })

  router.post('/analyze', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const { documentId, documentType } = req.body as {
        documentId?: string
        documentType?: string
      }

      if (!documentId || !documentType) {
        res.status(400).json({ error: 'documentId and documentType are required' })
        return
      }

      const threadId = `fleetgraph:${auth.workspaceId}:analyze:${documentId}`
      const runtime = getV2Runtime(req)
      const state = await runtime.invoke(
        buildAnalyzeInput(auth, threadId, {
          documentId,
          documentType,
          triggerSource: 'document-page',
          userQuestion: null,
        }),
        { threadId }
      )

      res.json(await serializeNativeState(runtime, threadId, state))
    } catch (error) {
      console.error('FleetGraph analyze error:', error)
      res.status(500).json({ error: 'Failed to analyze document' })
    }
  })

  router.post('/thread/:threadId/turn', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const { message } = req.body as { message?: string }
      if (!message) {
        res.status(400).json({ error: 'message is required' })
        return
      }

      const threadId = String(req.params.threadId)
      const runtime = getV2Runtime(req)
      const snapshot = await runtime.getState(threadId)
      const state = snapshot.values

      if (!state.documentId || state.workspaceId !== auth.workspaceId) {
        res.status(404).json({ error: 'No active FleetGraph session found for this thread' })
        return
      }

      const nextState = await runtime.invoke(
        buildAnalyzeInput(auth, threadId, {
          activeTab: state.activeTab,
          documentId: state.documentId,
          documentType: state.documentType ?? 'project',
          nestedPath: state.nestedPath,
          triggerSource: state.triggerSource || 'document-page',
          userQuestion: message,
        }),
        { threadId }
      )

      res.json(await serializeNativeState(runtime, threadId, nextState))
    } catch (error) {
      console.error('FleetGraph turn error:', error)
      res.status(500).json({ error: 'Failed to process conversation turn' })
    }
  })

  return router
}

export default createFleetGraphRouter
