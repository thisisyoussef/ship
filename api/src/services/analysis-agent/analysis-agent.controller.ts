import crypto from 'crypto'
import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../../middleware/auth.js'
import { getAuthContext } from '../../routes/route-helpers.js'
import { buildShipRestRequestContext } from '../fleetgraph/actions/executor.js'
import { createLLMAdapter, resolveLLMConfig } from '../fleetgraph/llm/index.js'
import { createAnalysisAgentService } from './analysis-agent.service.js'
import type { AnalysisChatRequest } from './types.js'

export function createAnalysisAgentRouter(): Router {
  const router = Router()

  // Lazy singleton for the service
  let service: ReturnType<typeof createAnalysisAgentService> | null = null
  function getService() {
    if (service) return service
    const llmConfig = resolveLLMConfig()
    const llm = createLLMAdapter(llmConfig)
    service = createAnalysisAgentService({ llm })
    return service
  }

  router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
    const auth = getAuthContext(req, res)
    if (!auth) return

    try {
      const body = req.body as AnalysisChatRequest
      if (!body.session_id || !body.message || !body.context?.entity_id) {
        res.status(400).json({ error: 'session_id, message, and context.entity_id are required' })
        return
      }

      const requestContext = buildShipRestRequestContext(req)
      const result = await getService().handleChat(body, {
        userId: auth.userId,
        workspaceId: auth.workspaceId,
      }, requestContext)

      res.json(result)
    } catch (error) {
      console.error('Analysis agent error:', error)
      res.status(500).json({
        response: 'An error occurred while processing your request.',
        tool_calls: [],
        session_id: (req.body as { session_id?: string })?.session_id ?? '',
        request_id: crypto.randomUUID(),
        verification: { claims_grounded: false, tool_calls_audited: 0, tool_calls_passed: 0, evidence_sources: [] },
        is_error: true,
        error_type: 'internal_error',
        suggested_followups: [],
      })
    }
  })

  return router
}
