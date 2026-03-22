import { Router, type Request, type Response } from 'express'
import { ZodError } from 'zod'

import {
  buildShipRestRequestContext,
  createFleetGraphFindingActionService,
  FleetGraphFindingActionError,
  type FleetGraphFindingActionReview,
  type FleetGraphFindingActionExecutionRecord,
} from '../services/fleetgraph/actions/index.js'
import {
  buildFleetGraphEvidenceChecklist,
  FleetGraphDeploymentReadinessResponseSchema,
  isFleetGraphServiceAuthorized,
  isSurfaceEnabled,
  resolveFleetGraphSurfaceReadiness,
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
  type FleetGraphInterruptSummary,
  type FleetGraphRuntime,
} from '../services/fleetgraph/graph/index.js'
import { createFleetGraphEntryService, FleetGraphEntryError } from '../services/fleetgraph/entry/index.js'
import {
  createFleetGraphEntryActionService,
  FleetGraphEntryActionError,
} from '../services/fleetgraph/entry/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAuthContext } from './route-helpers.js'

type RouterType = ReturnType<typeof Router>

interface FleetGraphRouterDeps {
  actionService?: ReturnType<typeof createFleetGraphFindingActionService>
  entryActionService?: ReturnType<typeof createFleetGraphEntryActionService>
  entryService?: ReturnType<typeof createFleetGraphEntryService>
  findingStore?: ReturnType<typeof createFleetGraphFindingStore>
  runtime?: FleetGraphRuntime
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
  const entryActionService = deps.entryActionService ?? createFleetGraphEntryActionService({ runtime })
  const findingStore = deps.findingStore ?? createFleetGraphFindingStore()
  const actionService = deps.actionService ?? createFleetGraphFindingActionService({
    findingStore,
    runtime,
  })
  const router: RouterType = Router()

  router.get('/ready', async (req: Request, res: Response) => {
    if (!isFleetGraphServiceAuthorized(readServiceToken(req))) {
      res.status(403).json({ error: 'FleetGraph service authorization failed' })
      return
    }

    const api = resolveFleetGraphSurfaceReadiness('api')
    const worker = resolveFleetGraphSurfaceReadiness('worker')
    const response = FleetGraphDeploymentReadinessResponseSchema.parse({
      api,
      checklist: buildFleetGraphEvidenceChecklist({ api, worker }, {}),
      worker,
    })

    res.status(api.ready && worker.ready ? 200 : 503).json(response)
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

  router.post('/entry/apply', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    if (!isSurfaceEnabled('api')) {
      res.status(503).json({ error: 'FleetGraph entry is not enabled in this environment' })
      return
    }

    try {
      const response = await entryActionService.applyEntry(req.body, {
        request: req,
        workspaceId: auth.workspaceId,
      })
      res.json(response)
    } catch (error) {
      if (error instanceof FleetGraphEntryActionError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      console.error('FleetGraph entry apply error:', error)
      res.status(500).json({ error: 'Failed to apply FleetGraph entry action' })
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
