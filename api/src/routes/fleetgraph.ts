import { Router, type Request, type Response } from 'express'
import { ZodError } from 'zod'

import {
  buildFleetGraphEvidenceChecklist,
  FleetGraphDeploymentReadinessResponseSchema,
  isFleetGraphServiceAuthorized,
  isSurfaceEnabled,
  resolveFleetGraphSurfaceReadiness,
} from '../services/fleetgraph/deployment/index.js'
import { createFleetGraphRuntime } from '../services/fleetgraph/graph/index.js'
import { createFleetGraphEntryService, FleetGraphEntryError } from '../services/fleetgraph/entry/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAuthContext } from './route-helpers.js'

type RouterType = ReturnType<typeof Router>

interface FleetGraphRouterDeps {
  entryService?: ReturnType<typeof createFleetGraphEntryService>
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

export function createFleetGraphRouter(
  deps: FleetGraphRouterDeps = {}
) {
  const entryService = deps.entryService ?? createFleetGraphEntryService({
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

  return router
}

export default createFleetGraphRouter()
