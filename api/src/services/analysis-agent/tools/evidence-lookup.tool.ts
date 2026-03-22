import { z } from 'zod'
import type { AnalysisTool, ToolContext, ToolResult } from '../types.js'
import { uuidSchema } from './schemas.js'
import { fetchShipApi } from './fetch-ship-api.js'

export const evidenceLookupTool: AnalysisTool = {
  name: 'evidence_lookup_get',
  description:
    'Look up evidence trail — comments, history, and iteration data for a specific entity. Use to find proof for claims and understand decision history.',
  parameters: z.object({
    entity_id: uuidSchema,
  }),

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id } = args as { entity_id: string }

      // Always try comments
      const comments = await fetchShipApi(
        `/api/documents/${entity_id}/comments`,
        ctx,
      ).catch(() => [])

      // Issue-specific: history + iterations
      const entityType = ctx.entityType
      let history: unknown = null
      let iterations: unknown = null

      if (entityType === 'issue') {
        ;[history, iterations] = await Promise.all([
          fetchShipApi(`/api/issues/${entity_id}/history`, ctx).catch(() => null),
          fetchShipApi(`/api/issues/${entity_id}/iterations`, ctx).catch(() => null),
        ])
      }

      return {
        success: true,
        data: { entity_id, comments, history, iterations },
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
