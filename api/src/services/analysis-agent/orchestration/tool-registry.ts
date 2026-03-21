import { z } from 'zod'
import type { AnalysisTool, ToolContext, ToolResult } from '../types.js'

import { analysisContextTool } from '../tools/analysis-context.tool.js'
import { entitySnapshotTool } from '../tools/entity-snapshot.tool.js'
import { metricTimeseriesTool } from '../tools/metric-timeseries.tool.js'
import { graphNeighborsTool } from '../tools/graph-neighbors.tool.js'
import { compareEntitiesTool } from '../tools/compare-entities.tool.js'
import { anomalyExplainTool } from '../tools/anomaly-explain.tool.js'
import { evidenceLookupTool } from '../tools/evidence-lookup.tool.js'

// ── Tool registry ─────────────────────────────────────────────────

export const ALL_ANALYSIS_TOOLS: AnalysisTool[] = [
  analysisContextTool,
  entitySnapshotTool,
  metricTimeseriesTool,
  graphNeighborsTool,
  compareEntitiesTool,
  anomalyExplainTool,
  evidenceLookupTool,
]

const toolMap = new Map<string, AnalysisTool>(
  ALL_ANALYSIS_TOOLS.map((t) => [t.name, t]),
)

export function getAnalysisTool(name: string): AnalysisTool | undefined {
  return toolMap.get(name)
}

export async function executeAnalysisTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = toolMap.get(name)
  if (!tool) {
    return { success: false, error: `Unknown tool: ${name}` }
  }

  // Validate args against the tool's Zod schema
  const parsed = tool.parameters.safeParse(args)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid arguments for ${name}: ${parsed.error.message}`,
    }
  }

  return tool.execute(parsed.data, ctx)
}

export function getToolSchemas(): Array<{
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}> {
  return ALL_ANALYSIS_TOOLS.map((tool) => ({
    type: 'function' as const,
    name: tool.name,
    description: tool.description,
    parameters: zodToJsonSchema(tool.parameters),
  }))
}

// ── Zod → JSON Schema converter ──────────────────────────────────
// Minimal converter handling the types used by analysis tools:
// string, number, boolean, enum, array, object, optional

function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  return convertZodNode(schema)
}

function convertZodNode(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = schema._def

  // ZodOptional — unwrap and mark not-required at the parent level
  if (def.typeName === 'ZodOptional') {
    return convertZodNode(def.innerType)
  }

  // ZodDefault — unwrap
  if (def.typeName === 'ZodDefault') {
    return convertZodNode(def.innerType)
  }

  // ZodString
  if (def.typeName === 'ZodString') {
    return { type: 'string' }
  }

  // ZodNumber
  if (def.typeName === 'ZodNumber') {
    return { type: 'number' }
  }

  // ZodBoolean
  if (def.typeName === 'ZodBoolean') {
    return { type: 'boolean' }
  }

  // ZodEnum
  if (def.typeName === 'ZodEnum') {
    return { type: 'string', enum: def.values }
  }

  // ZodArray
  if (def.typeName === 'ZodArray') {
    const result: Record<string, unknown> = {
      type: 'array',
      items: convertZodNode(def.type),
    }
    if (def.minLength?.value != null) result.minItems = def.minLength.value
    if (def.maxLength?.value != null) result.maxItems = def.maxLength.value
    return result
  }

  // ZodObject
  if (def.typeName === 'ZodObject') {
    const shape = def.shape() as Record<string, z.ZodTypeAny>
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertZodNode(value)
      // If the field is not optional, it's required
      if (!isZodOptional(value)) {
        required.push(key)
      }
    }

    const result: Record<string, unknown> = {
      type: 'object',
      properties,
    }
    if (required.length > 0) result.required = required
    return result
  }

  // Fallback
  return { type: 'object' }
}

function isZodOptional(schema: z.ZodTypeAny): boolean {
  const typeName = schema._def.typeName
  if (typeName === 'ZodOptional') return true
  if (typeName === 'ZodDefault') return true
  return false
}
