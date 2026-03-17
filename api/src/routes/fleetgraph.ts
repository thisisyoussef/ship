import { Router, type Request, type Response } from 'express'
import { ZodError } from 'zod'

import {
  createFleetGraphFindingActionService,
  FleetGraphFindingActionError,
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
import { createFleetGraphRuntime } from '../services/fleetgraph/graph/index.js'
import { createFleetGraphEntryService, FleetGraphEntryError } from '../services/fleetgraph/entry/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAuthContext } from './route-helpers.js'

type RouterType = ReturnType<typeof Router>

interface FleetGraphRouterDeps {
  actionService?: ReturnType<typeof createFleetGraphFindingActionService>
  entryService?: ReturnType<typeof createFleetGraphEntryService>
  findingStore?: ReturnType<typeof createFleetGraphFindingStore>
}

const runtime = createFleetGraphRuntime()

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
  const entryService = deps.entryService ?? createFleetGraphEntryService({
    runtime,
  })
  const findingStore = deps.findingStore ?? createFleetGraphFindingStore()
  const actionService = deps.actionService ?? createFleetGraphFindingActionService({
    findingStore,
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

  router.post('/findings/:id/snooze', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
      return
    }

    try {
      const body = FleetGraphSnoozeRequestSchema.parse(req.body ?? {})
      const snoozedUntil = new Date(Date.now() + body.minutes * 60_000)
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

  return router
}

export default createFleetGraphRouter()
