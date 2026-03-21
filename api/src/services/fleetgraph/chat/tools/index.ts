/**
 * FleetGraph Chat Tool Registry
 *
 * Combines retrieval and action tools into a single registry with
 * lookup helpers and an execution dispatcher.
 */

import type { LLMToolSchema } from '../../llm/types.js'
import type { ChatToolDefinition, ChatToolResult } from '../types.js'

import { ACTION_TOOLS, executeActionTool } from './actions.js'
import { RETRIEVAL_TOOLS, executeRetrievalTool, type ToolExecutionContext } from './retrieval.js'
import { buildToolSchema } from './schemas.js'

// Re-export for downstream convenience
export type { ToolExecutionContext } from './retrieval.js'

// ──────────────────────────────────────────────────────────────────────────────
// Combined registry
// ──────────────────────────────────────────────────────────────────────────────

export const ALL_CHAT_TOOLS: ChatToolDefinition[] = [
  ...RETRIEVAL_TOOLS,
  ...ACTION_TOOLS,
]

export const ALL_TOOL_SCHEMAS: LLMToolSchema[] = ALL_CHAT_TOOLS.map((tool) =>
  buildToolSchema({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  })
)

// ──────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ──────────────────────────────────────────────────────────────────────────────

const toolMap = new Map<string, ChatToolDefinition>(
  ALL_CHAT_TOOLS.map((t) => [t.name, t])
)

const actionNames = new Set(ACTION_TOOLS.map((t) => t.name))

export function getToolDefinition(name: string): ChatToolDefinition | undefined {
  return toolMap.get(name)
}

export function isActionTool(name: string): boolean {
  return actionNames.has(name)
}

// ──────────────────────────────────────────────────────────────────────────────
// Execution dispatcher
// ──────────────────────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  params: unknown,
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  const definition = toolMap.get(name)
  if (!definition) {
    return { success: false, error: `Unknown tool: ${name}` }
  }

  // Validate params against the Zod schema
  const parsed = definition.parameters.safeParse(params)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid parameters for ${name}: ${parsed.error.message}`,
    }
  }

  if (definition.category === 'retrieval') {
    return executeRetrievalTool(name, parsed.data, ctx)
  }

  return executeActionTool(name, parsed.data, ctx.workspaceId)
}
