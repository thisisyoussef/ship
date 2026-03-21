import type { z } from 'zod'
import type { ShipRestRequestContext } from '../fleetgraph/actions/executor.js'

// ── Request contract ──────────────────────────────────────────────

export interface AnalysisChatRequest {
  session_id: string
  message: string
  context: AnalysisContext
}

export interface AnalysisContext {
  surface: 'analysis'
  entity_type: string     // sprint | project | issue | program | wiki
  entity_id: string
  entity_title?: string
  selected_ids?: string[]
  filters?: Record<string, string[]>
  date_range?: { start: string; end: string }
  visible_metrics?: string[]
  comparison_ids?: string[]
}

// ── Response contract ─────────────────────────────────────────────

export interface ActionSuggestion {
  action: string
  target_id: string
  target_type: string
  label: string
  rationale: string
}

export interface AnalysisChatResponse {
  response: string
  tool_calls: ToolCallRecord[]
  session_id: string
  request_id: string
  verification: VerificationResult
  is_error: boolean
  error_type: string | null
  suggested_followups: string[]
  action_suggestions: ActionSuggestion[]
}

export interface ToolCallRecord {
  name: string
  args: Record<string, unknown>
  result: string
  duration_ms: number
}

export interface VerificationResult {
  claims_grounded: boolean
  tool_calls_audited: number
  tool_calls_passed: number
  evidence_sources: string[]
}

// ── Tool types ────────────────────────────────────────────────────

export interface AnalysisTool {
  name: string
  description: string
  parameters: z.ZodSchema
  execute: (args: unknown, ctx: ToolContext) => Promise<ToolResult>
}

export interface ToolContext {
  entityId: string
  entityType: string
  workspaceId: string
  requestContext: ShipRestRequestContext
  analysisContext: AnalysisContext
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}
