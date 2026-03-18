import { Router, type Request, type Response } from 'express'
import { ZodError } from 'zod'

import {
  createFleetGraphOnDemandActionService,
  buildShipRestRequestContext,
  createFleetGraphFindingActionService,
  FleetGraphFindingActionError,
  FleetGraphOnDemandActionError,
  type FleetGraphFindingActionReview,
  type FleetGraphFindingActionExecutionRecord,
} from '../services/fleetgraph/actions/index.js'
import {
  buildFleetGraphEvidenceChecklist,
  FleetGraphDeploymentReadinessResponseSchema,
  isFleetGraphServiceAuthorized,
  isFleetGraphV2Enabled,
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
  createFleetGraphRuntime,
  createFleetGraphV2Runtime,
  type FleetGraphInterruptSummary,
  type FleetGraphRuntime,
  type FleetGraphV2Runtime,
  type FleetGraphV2RuntimeInput,
} from '../services/fleetgraph/graph/index.js'
import {
  FleetGraphOnDemandActionApplyResponseSchema,
  FleetGraphOnDemandActionReviewResponseSchema,
} from '../services/fleetgraph/graph/on-demand-actions.js'
import { createFleetGraphEntryService, FleetGraphEntryError } from '../services/fleetgraph/entry/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAuthContext } from './route-helpers.js'

type RouterType = ReturnType<typeof Router>

interface FleetGraphRouterDeps {
  actionService?: ReturnType<typeof createFleetGraphFindingActionService>
  entryService?: ReturnType<typeof createFleetGraphEntryService>
  findingStore?: ReturnType<typeof createFleetGraphFindingStore>
  onDemandActionService?: ReturnType<typeof createFleetGraphOnDemandActionService>
  runtime?: FleetGraphRuntime
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

function serializeInterrupt(interrupt: FleetGraphInterruptSummary) {
  return {
    id: interrupt.id,
    taskName: interrupt.taskName,
    value: interrupt.value,
  }
}

function serializeCheckpoint(snapshot: Awaited<ReturnType<FleetGraphRuntime['getState']>>) {
  const values = snapshot.values as Record<string, unknown>
  return {
    branch: typeof values.branch === 'string' ? values.branch : undefined,
    createdAt: snapshot.createdAt,
    next: snapshot.next,
    outcome: typeof values.outcome === 'string' ? values.outcome : undefined,
    path: Array.isArray(values.path) ? values.path : [],
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

export function createFleetGraphRouter(
  deps: FleetGraphRouterDeps = {}
) {
  const runtime = deps.runtime ?? createFleetGraphRuntime()
  const entryService = deps.entryService ?? createFleetGraphEntryService({ runtime })
  const findingStore = deps.findingStore ?? createFleetGraphFindingStore()
  const actionService = deps.actionService ?? createFleetGraphFindingActionService({
    findingStore,
    runtime,
  })
  const onDemandActionService = deps.onDemandActionService ?? createFleetGraphOnDemandActionService({
    runtime,
  })

  // V2 runtime - lazy initialization with request context
  let runtimeV2: FleetGraphV2Runtime | null = deps.runtimeV2 ?? null
  function getV2Runtime(req: Request): FleetGraphV2Runtime {
    if (runtimeV2) return runtimeV2

    const baseUrl = process.env.SHIP_API_BASE_URL || `${req.protocol}://${req.get('host')}`
    const token = process.env.FLEETGRAPH_SERVICE_TOKEN || ''

    runtimeV2 = createFleetGraphV2Runtime({
      fetchConfig: {
        baseUrl,
        token,
        requestContext: buildShipRestRequestContext(req),
      },
    })
    return runtimeV2
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
    const response = FleetGraphDeploymentReadinessResponseSchema.parse({
      api,
      checklist: buildFleetGraphEvidenceChecklist({ api, worker }, {}),
      worker,
    })

    // Add V2 info to response (outside schema for now, during migration)
    const extendedResponse = {
      ...response,
      v2: {
        enabled: v2.enabled,
        rolloutPercent: v2.rolloutPercent,
      },
    }

    res.status(api.ready && worker.ready ? 200 : 503).json(extendedResponse)
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

    // Check if V2 is enabled for this request
    const threadId = `fleetgraph:${auth.workspaceId}:entry:${Date.now()}`
    const useV2 = isFleetGraphV2Enabled(process.env, threadId)

    if (useV2) {
      try {
        const body = req.body as {
          context?: { current?: { id?: string; document_type?: string; title?: string } }
          route?: { activeTab?: string; nestedPath?: string[]; surface?: string }
          trigger?: { documentId?: string; documentType?: string; mode?: string }
          draft?: { requestedAction?: unknown }
        }

        const documentId = body.trigger?.documentId ?? body.context?.current?.id
        const documentType = body.trigger?.documentType ?? body.context?.current?.document_type

        if (!documentId || !documentType) {
          res.status(400).json({ error: 'documentId and documentType are required' })
          return
        }

        const v2Runtime = getV2Runtime(req)
        const v2State = await v2Runtime.invoke({
          workspaceId: auth.workspaceId,
          threadId,
          mode: 'on_demand',
          triggerType: 'user_chat',
          triggerSource: body.route?.surface ?? 'document-page',
          actorId: auth.userId ?? null,
          viewerUserId: auth.userId ?? null,
          documentId,
          documentType: documentType as 'issue' | 'project' | 'sprint' | 'wiki' | 'person' | 'program' | null,
          activeTab: body.route?.activeTab ?? null,
          nestedPath: body.route?.nestedPath?.join('/') ?? null,
          projectContextId: null,
          userQuestion: null,
          dirtyEntityId: null,
          dirtyEntityType: null,
          dirtyWriteType: null,
          dirtyCoalescedIds: [],
        })

        // Map V2 branch to V1 outcome
        const outcomeMap: Record<string, string> = {
          quiet: 'quiet',
          advisory: 'advisory',
          action_required: 'approval_required',
          fallback: 'fallback',
        }
        const outcome = outcomeMap[v2State.branch] ?? 'quiet'

        // Extract detail/title from ResponsePayload if available
        let responseDetail = `FleetGraph V2 analyzed ${body.context?.current?.title ?? 'this document'}.`
        let responseTitle = outcome === 'quiet' ? 'No action needed' : 'FleetGraph ready'

        if (v2State.responsePayload?.type === 'insight_cards' && v2State.responsePayload.cards.length > 0) {
          responseTitle = v2State.responsePayload.cards[0]?.title ?? responseTitle
          responseDetail = v2State.responsePayload.cards[0]?.body ?? responseDetail
        } else if (v2State.responsePayload?.type === 'chat_answer') {
          responseDetail = v2State.responsePayload.answer.text
        } else if (v2State.responsePayload?.type === 'degraded') {
          responseDetail = v2State.responsePayload.disclaimer
        }

        // Build V1-compatible response from V2 state
        const response = {
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
          run: {
            branch: v2State.branch === 'action_required' ? 'approval_required' : v2State.branch,
            outcome,
            path: v2State.path,
            routeSurface: body.route?.surface ?? 'document-page',
            threadId,
          },
          summary: {
            detail: responseDetail,
            surfaceLabel: body.route?.surface ?? 'document-page',
            title: responseTitle,
          },
          // Include V2-specific data for clients that support it
          v2: {
            reasonedFindings: v2State.reasonedFindings,
            scoredFindings: v2State.scoredFindings,
            proposedActions: v2State.proposedActions,
            pendingApproval: v2State.pendingApproval,
          },
        }

        res.json(response)
        return
      } catch (error) {
        console.error('FleetGraph V2 entry error, falling back to V1:', error)
        // Fall through to V1 entry service
      }
    }

    // V1 path
    try {
      const response = await entryService.createEntry(req.body, auth)
      res.json(response)
    } catch (error) {
      if (error instanceof FleetGraphEntryError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid FleetGraph payload' })
        return
      }

      console.error('FleetGraph entry error:', error)
      res.status(500).json({ error: 'Failed to create FleetGraph entry' })
    }
  })

  router.get('/findings', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    const documentIds = readDocumentIds(req)

    try {
      const findings = await findingStore.listActiveFindings({
        documentIds,
        workspaceId: auth.workspaceId,
      })
      const findingsWithExecutions = await actionService.attachExecutions(
        findings,
        auth.workspaceId
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
      const threads = await Promise.all(
        threadIds.map(async (threadId) => {
          const [history, pendingInterrupts] = await Promise.all([
            runtime.getCheckpointHistory(threadId),
            runtime.getPendingInterrupts(threadId),
          ])

          return {
            checkpoints: history.map(serializeCheckpoint),
            pendingInterrupts: pendingInterrupts.map(serializeInterrupt),
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
        auth.workspaceId
      )

      if (!finding) {
        res.status(404).json({ error: 'FleetGraph finding not found' })
        return
      }

      const [findingWithExecution] = await actionService.attachExecutions(
        [finding],
        auth.workspaceId
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
      const snoozedUntil = new Date(Date.now() + durationMs)
      const finding = await findingStore.snoozeFinding(
        String(req.params.id),
        auth.workspaceId,
        snoozedUntil
      )

      if (!finding) {
        res.status(404).json({ error: 'FleetGraph finding not found' })
        return
      }

      const [findingWithExecution] = await actionService.attachExecutions(
        [finding],
        auth.workspaceId
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
      const response = await onDemandActionService.reviewThreadAction({
        actionId: String(req.params.actionId),
        threadId: String(req.params.threadId),
        workspaceId: auth.workspaceId,
      })

      res.json(FleetGraphOnDemandActionReviewResponseSchema.parse(response))
    } catch (error) {
      if (error instanceof FleetGraphOnDemandActionError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      console.error('FleetGraph on-demand action review error:', error)
      res.status(500).json({ error: 'Failed to prepare FleetGraph action review' })
    }
  })

  router.post('/thread/:threadId/actions/:actionId/apply', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const response = await onDemandActionService.applyThreadAction({
        actionId: String(req.params.actionId),
        request: req,
        threadId: String(req.params.threadId),
        workspaceId: auth.workspaceId,
      })

      res.json(FleetGraphOnDemandActionApplyResponseSchema.parse(response))
    } catch (error) {
      if (error instanceof FleetGraphOnDemandActionError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      console.error('FleetGraph on-demand action apply error:', error)
      res.status(500).json({ error: 'Failed to apply FleetGraph action' })
    }
  })

  // ── V2 Three-Lane Architecture Invoke ──
  // Unified endpoint for all three lanes: proactive sweep, on-demand, event-driven
  router.post('/v2/invoke', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) return

    try {
      const body = req.body as Partial<FleetGraphV2RuntimeInput>

      // Validate required fields
      if (!body.triggerType) {
        res.status(400).json({ error: 'triggerType is required (sweep, user_chat, or enqueue)' })
        return
      }

      // Derive mode from trigger type
      const modeMap = {
        sweep: 'proactive' as const,
        user_chat: 'on_demand' as const,
        enqueue: 'event_driven' as const,
      }
      const mode = modeMap[body.triggerType]

      // Build input with defaults
      const threadId = body.threadId ??
        `fleetgraph:${auth.workspaceId}:v2:${body.triggerType}:${Date.now()}`

      const input: FleetGraphV2RuntimeInput = {
        workspaceId: auth.workspaceId,
        threadId,
        mode,
        triggerType: body.triggerType,
        triggerSource: body.triggerSource ?? 'api',
        actorId: body.actorId ?? auth.userId ?? null,
        viewerUserId: body.viewerUserId ?? auth.userId ?? null,
        documentId: body.documentId ?? null,
        documentType: body.documentType ?? null,
        activeTab: body.activeTab ?? null,
        nestedPath: body.nestedPath ?? null,
        projectContextId: body.projectContextId ?? null,
        userQuestion: body.userQuestion ?? null,
        dirtyEntityId: body.dirtyEntityId ?? null,
        dirtyEntityType: body.dirtyEntityType ?? null,
        dirtyWriteType: body.dirtyWriteType ?? null,
        dirtyCoalescedIds: body.dirtyCoalescedIds ?? [],
      }

      const v2Runtime = getV2Runtime(req)
      const state = await v2Runtime.invoke(input, { threadId })

      res.json({
        branch: state.branch,
        mode: state.mode,
        path: state.path,
        reasonedFindings: state.reasonedFindings,
        responsePayload: state.responsePayload,
        runId: state.runId,
        threadId,
        traceMetadata: state.traceMetadata,
      })
    } catch (error) {
      console.error('FleetGraph V2 invoke error:', error)
      const message = error instanceof Error ? error.message : 'Failed to invoke FleetGraph V2'
      res.status(500).json({ error: message })
    }
  })

  // ── V2 Resume (for approval interrupts) ──
  router.post('/v2/resume/:threadId', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) return

    try {
      const { decision } = req.body as { decision?: 'approved' | 'dismissed' | 'snoozed' }

      if (!decision) {
        res.status(400).json({ error: 'decision is required (approved, dismissed, or snoozed)' })
        return
      }

      const threadId = String(req.params.threadId)
      const v2Runtime = getV2Runtime(req)
      const state = await v2Runtime.resume(threadId, decision)

      res.json({
        actionResult: state.actionResult,
        approvalDecision: state.approvalDecision,
        branch: state.branch,
        path: state.path,
        responsePayload: state.responsePayload,
        threadId,
      })
    } catch (error) {
      console.error('FleetGraph V2 resume error:', error)
      const message = error instanceof Error ? error.message : 'Failed to resume FleetGraph V2'
      res.status(500).json({ error: message })
    }
  })

  // ── V2 Get State (for debugging/UI) ──
  router.get('/v2/state/:threadId', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) return

    try {
      const threadId = String(req.params.threadId)
      const v2Runtime = getV2Runtime(req)
      const snapshot = await v2Runtime.getState(threadId)

      res.json({
        threadId,
        values: snapshot.values,
      })
    } catch (error) {
      console.error('FleetGraph V2 state error:', error)
      const message = error instanceof Error ? error.message : 'Failed to get FleetGraph V2 state'
      res.status(500).json({ error: message })
    }
  })

  // ── On-demand analysis (auto-analysis on document open) ──
  router.post('/analyze', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) return

    try {
      const { documentId, documentType, documentTitle } = req.body as {
        documentId?: string
        documentTitle?: string
        documentType?: string
      }

      if (!documentId || !documentType) {
        res.status(400).json({ error: 'documentId and documentType are required' })
        return
      }

      const threadId = `fleetgraph:${auth.workspaceId}:analyze:${documentId}`
      const useV2 = isFleetGraphV2Enabled(process.env, threadId)

      if (useV2) {
        const v2Runtime = getV2Runtime(req)
        const v2State = await v2Runtime.invoke({
          workspaceId: auth.workspaceId,
          threadId,
          mode: 'on_demand',
          triggerType: 'user_chat',
          triggerSource: 'document-page',
          actorId: auth.userId ?? null,
          viewerUserId: auth.userId ?? null,
          documentId,
          documentType: documentType as 'issue' | 'project' | 'sprint' | 'wiki' | 'person' | 'program' | null,
          activeTab: null,
          nestedPath: null,
          projectContextId: null,
          userQuestion: null,
          dirtyEntityId: null,
          dirtyEntityType: null,
          dirtyWriteType: null,
          dirtyCoalescedIds: [],
        })

        // Map V2 branch to V1 outcome
        const outcomeMap: Record<string, string> = {
          quiet: 'quiet',
          advisory: 'advisory',
          action_required: 'approval_required',
          fallback: 'fallback',
        }

        // Extract analysis text from ResponsePayload
        let analysisText = ''
        if (v2State.responsePayload?.type === 'insight_cards' && v2State.responsePayload.cards.length > 0) {
          analysisText = v2State.responsePayload.cards.map(c => c.body).join('\n\n')
        } else if (v2State.responsePayload?.type === 'chat_answer') {
          analysisText = v2State.responsePayload.answer.text
        } else if (v2State.responsePayload?.type === 'degraded') {
          analysisText = v2State.responsePayload.disclaimer
        }

        // Map V2 reasonedFindings to V1 FleetGraphFinding format
        const analysisFindings = (v2State.reasonedFindings ?? []).map((rf, index) => {
          // Find corresponding proposed action if any
          const proposedAction = v2State.proposedActions.find(
            pa => pa.findingFingerprint === rf.fingerprint
          )

          // Derive action type from finding type
          const actionTypeMap: Record<string, string> = {
            week_start_drift: 'start_week',
            empty_active_week: 'assign_issues',
            missing_standup: 'post_standup',
            approval_gap: 'approve_week_plan',
            deadline_risk: 'escalate_risk',
            workload_imbalance: 'rebalance_load',
            blocker_aging: 'post_comment',
          }
          const actionType = actionTypeMap[rf.findingType] ?? 'post_comment'

          return {
            actionTier: index === 0 ? 'A' : index === 1 ? 'B' : 'C',
            evidence: [] as string[], // V2 doesn't include evidence in ReasonedFinding
            findingType: rf.findingType,
            proposedAction: proposedAction ? {
              actionId: `${actionType}:${proposedAction.targetEntity.id}`,
              actionType,
              dialogKind: 'confirm' as const,
              endpoint: {
                method: proposedAction.endpoint.method,
                path: proposedAction.endpoint.path,
              },
              label: proposedAction.label,
              reviewSummary: proposedAction.safetyRationale,
              reviewTitle: rf.title,
              targetId: proposedAction.targetEntity.id,
              targetType: proposedAction.targetEntity.type as 'project' | 'sprint',
            } : undefined,
            severity: rf.severity,
            summary: rf.explanation,
            title: rf.title,
          }
        })

        // Derive action type for pending approval
        const pendingActionTypeMap: Record<string, string> = {
          week_start_drift: 'start_week',
          empty_active_week: 'assign_issues',
          missing_standup: 'post_standup',
          approval_gap: 'approve_week_plan',
          deadline_risk: 'escalate_risk',
          workload_imbalance: 'rebalance_load',
          blocker_aging: 'post_comment',
        }
        const pendingActionType = v2State.pendingApproval?.reasonedFinding
          ? pendingActionTypeMap[v2State.pendingApproval.reasonedFinding.findingType] ?? 'post_comment'
          : 'post_comment'

        res.json({
          analysisFindings,
          analysisText,
          outcome: outcomeMap[v2State.branch] ?? 'quiet',
          path: v2State.path,
          pendingAction: v2State.pendingApproval?.proposedAction ? {
            actionId: `${pendingActionType}:${v2State.pendingApproval.proposedAction.targetEntity.id}`,
            actionType: pendingActionType,
            dialogKind: 'confirm' as const,
            endpoint: {
              method: v2State.pendingApproval.proposedAction.endpoint.method,
              path: v2State.pendingApproval.proposedAction.endpoint.path,
            },
            label: v2State.pendingApproval.proposedAction.label,
            reviewSummary: v2State.pendingApproval.proposedAction.safetyRationale,
            reviewTitle: v2State.pendingApproval.reasonedFinding.title,
            targetId: v2State.pendingApproval.proposedAction.targetEntity.id,
            targetType: v2State.pendingApproval.proposedAction.targetEntity.type as 'project' | 'sprint',
          } : undefined,
          threadId,
          v2: true,
        })
        return
      }

      // V1 path
      const state = await runtime.invoke({
        contextKind: 'entry',
        documentId,
        documentTitle: documentTitle || 'Untitled',
        documentType,
        mode: 'on_demand',
        routeSurface: 'document-page',
        threadId,
        trigger: 'document-context',
        workspaceId: auth.workspaceId,
      }, {
        fleetgraphReadRequestContext: buildShipRestRequestContext(req),
      })

      const extended = state as unknown as Record<string, unknown>
      res.json({
        analysisFindings: extended.analysisFindings ?? [],
        analysisText: extended.analysisText ?? '',
        outcome: state.outcome,
        path: state.path,
        pendingAction: extended.pendingAction,
        threadId,
      })
    } catch (error) {
      console.error('FleetGraph analyze error:', error)
      const message = error instanceof Error ? error.message : 'Failed to analyze document'
      res.status(500).json({ error: message })
    }
  })

  // ── Conversation turn (follow-up questions) ──
  router.post('/thread/:threadId/turn', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) return

    try {
      const { message } = req.body as { message?: string }
      if (!message) {
        res.status(400).json({ error: 'message is required' })
        return
      }

      const threadId = String(req.params.threadId)

      // Get existing state to extract context
      const existingState = await runtime.getState(threadId)
      const values = existingState.values as Record<string, unknown> | undefined

      if (!values?.documentId) {
        res.status(404).json({ error: 'No active session found for this thread' })
        return
      }

      // TODO: pass userMessage to graph once reason node is wired into master's scenario runner
      const state = await runtime.invoke({
        contextKind: 'entry' as const,
        documentId: values.documentId as string,
        documentTitle: (values.documentTitle as string) ?? 'Untitled',
        documentType: (values.documentType as string) ?? 'document',
        mode: 'on_demand' as const,
        routeSurface: 'document-page',
        threadId,
        trigger: 'document-context' as const,
        workspaceId: auth.workspaceId,
      }, {
        fleetgraphReadRequestContext: buildShipRestRequestContext(req),
      })

      const extended = state as unknown as Record<string, unknown>
      res.json({
        analysisFindings: extended.analysisFindings ?? [],
        analysisText: extended.analysisText ?? '',
        outcome: state.outcome,
        path: state.path,
        pendingAction: extended.pendingAction,
        threadId,
        turnCount: extended.turnCount,
      })
    } catch (error) {
      console.error('FleetGraph turn error:', error)
      res.status(500).json({ error: 'Failed to process conversation turn' })
    }
  })

  return router
}

export default createFleetGraphRouter
