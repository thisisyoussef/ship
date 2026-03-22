import { z } from 'zod'
import type { AnalysisTool, ToolContext, ToolResult } from '../types.js'
import { uuidSchema } from './schemas.js'
import { fetchShipApi } from './fetch-ship-api.js'

export const compareEntitiesTool: AnalysisTool = {
  name: 'compare_entities_get',
  description:
    'Compare two or more entities side-by-side. Fetches each entity\'s snapshot and returns a structured comparison of their properties, status, and metrics.',
  parameters: z.object({
    entity_ids: z.array(uuidSchema).min(2).max(5),
  }),

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    try {
      const { entity_ids } = args as { entity_ids: string[] }

      const snapshots = await Promise.all(
        entity_ids.map(async (id) => {
          try {
            return await fetchShipApi(`/api/documents/${id}`, ctx)
          } catch (err) {
            return { id, error: String(err) }
          }
        }),
      )

      return { success: true, data: { entities: snapshots } }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
