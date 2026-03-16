import { Router, type Request, type Response } from 'express'
import { ZodError } from 'zod'

import { createFleetGraphRuntime } from '../services/fleetgraph/graph/index.js'
import { createFleetGraphEntryService, FleetGraphEntryError } from '../services/fleetgraph/entry/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAuthContext } from './route-helpers.js'

type RouterType = ReturnType<typeof Router>

interface FleetGraphRouterDeps {
  entryService?: ReturnType<typeof createFleetGraphEntryService>
}

const runtime = createFleetGraphRuntime()

export function createFleetGraphRouter(
  deps: FleetGraphRouterDeps = {}
) {
  const entryService = deps.entryService ?? createFleetGraphEntryService({
    runtime,
  })
  const router: RouterType = Router()

  router.post('/entry', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) {
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
