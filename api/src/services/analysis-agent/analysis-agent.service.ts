import crypto from 'crypto'
import type { LLMAdapter } from '../fleetgraph/llm/types.js'
import type { ShipRestRequestContext } from '../fleetgraph/actions/executor.js'
import type {
  AnalysisChatRequest,
  AnalysisChatResponse,
  AnalysisContext,
  ToolContext,
} from './types.js'
import { createSessionMemoryService, type SessionMemoryService } from './memory/session-memory.service.js'
import { classifyIntent } from './orchestration/intent-classifier.service.js'
import { createAnalysisGraphService } from './orchestration/analysis-graph.service.js'

// ── Types ────────────────────────────────────────────────────────

export interface AnalysisAgentServiceDeps {
  llm: LLMAdapter
}

// ── Validation ───────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_MESSAGE_LENGTH = 5000

function validateRequest(
  body: AnalysisChatRequest,
): { ok: true } | { ok: false; error: string; errorType: string } {
  if (!body.message || body.message.trim().length === 0) {
    return { ok: false, error: 'Message cannot be empty.', errorType: 'validation_error' }
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters).`, errorType: 'validation_error' }
  }
  if (!body.session_id || !UUID_REGEX.test(body.session_id)) {
    return { ok: false, error: 'session_id must be a valid UUID.', errorType: 'validation_error' }
  }
  if (!body.context?.entity_id) {
    return { ok: false, error: 'context.entity_id is required.', errorType: 'validation_error' }
  }
  return { ok: true }
}

// ── Service ──────────────────────────────────────────────────────

export function createAnalysisAgentService(deps: AnalysisAgentServiceDeps) {
  const memory: SessionMemoryService = createSessionMemoryService()
  const graph = createAnalysisGraphService({ llm: deps.llm })

  return {
    async handleChat(
      request: AnalysisChatRequest,
      auth: { userId: string; workspaceId: string },
      reqCtx: ShipRestRequestContext,
    ): Promise<AnalysisChatResponse> {
      const requestId = crypto.randomUUID()

      // Policy check
      const validation = validateRequest(request)
      if (!validation.ok) {
        return {
          response: validation.error,
          tool_calls: [],
          session_id: request.session_id ?? '',
          request_id: requestId,
          verification: { claims_grounded: false, tool_calls_audited: 0, tool_calls_passed: 0, evidence_sources: [] },
          is_error: true,
          error_type: validation.errorType,
          suggested_followups: [],
        }
      }

      // Session
      const session = memory.getOrCreate(request.session_id, request.context)
      memory.updateContext(request.session_id, request.context)

      // Intent classification
      const intent = classifyIntent(request.message, request.context)

      if (intent === 'out_of_scope') {
        const entityLabel = request.context.entity_type || 'entity'
        const refusal = `I can help you analyze the current ${entityLabel}. Try asking about its status, issues, or trends.`

        memory.addTurn(request.session_id, { role: 'user', content: request.message })
        memory.addTurn(request.session_id, { role: 'assistant', content: refusal })

        return {
          response: refusal,
          tool_calls: [],
          session_id: request.session_id,
          request_id: requestId,
          verification: { claims_grounded: false, tool_calls_audited: 0, tool_calls_passed: 0, evidence_sources: [] },
          is_error: false,
          error_type: null,
          suggested_followups: [
            `What is the status of this ${entityLabel}?`,
            `Are there any blockers?`,
            `Show me recent activity.`,
          ],
        }
      }

      // Build tool context
      const toolContext: ToolContext = {
        entityId: request.context.entity_id,
        entityType: request.context.entity_type,
        workspaceId: auth.workspaceId,
        requestContext: reqCtx,
        analysisContext: request.context,
      }

      // Run analysis graph
      const recentTurns = memory.getRecentTurns(request.session_id).map((t) => ({
        role: t.role,
        content: t.content,
      }))
      const summary = memory.getSummary(request.session_id)

      const result = await graph.run({
        message: request.message,
        context: request.context,
        recentTurns,
        summary,
        toolContext,
      })

      // Build verification
      const passedCalls = result.toolCalls.filter((tc) => {
        try {
          const parsed = JSON.parse(tc.result)
          return !parsed.error
        } catch {
          return !tc.result.includes('"error"')
        }
      })

      const evidenceSources = [...new Set(result.toolCalls.map((tc) => tc.name))]

      const verification = {
        claims_grounded: result.toolCalls.length > 0,
        tool_calls_audited: result.toolCalls.length,
        tool_calls_passed: passedCalls.length,
        evidence_sources: evidenceSources,
      }

      // Record turns in memory
      memory.addTurn(request.session_id, { role: 'user', content: request.message })
      memory.addTurn(request.session_id, {
        role: 'assistant',
        content: result.response,
        toolCalls: result.toolCalls,
      })

      return {
        response: result.response,
        tool_calls: result.toolCalls,
        session_id: request.session_id,
        request_id: requestId,
        verification,
        is_error: false,
        error_type: null,
        suggested_followups: result.suggestedFollowups,
      }
    },
  }
}
