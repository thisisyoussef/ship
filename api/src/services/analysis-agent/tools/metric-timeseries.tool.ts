import { z } from 'zod'
import type { AnalysisTool, ToolContext, ToolResult } from '../types.js'
import { fetchShipApi } from './fetch-ship-api.js'

export const metricTimeseriesTool: AnalysisTool = {
  name: 'metric_timeseries_get',
  description:
    'Fetch activity timeline for an entity — recent changes, state transitions, and events over time. Use to understand trends and when things changed.',
  parameters: z.object({
    entity_type: z.enum(['program', 'project', 'sprint']),
    entity_id: z.string(),
  }),

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    try {
      const { entity_type, entity_id } = args as {
        entity_type: string
        entity_id: string
      }

      const activity = await fetchShipApi(
        `/api/activity/${entity_type}/${entity_id}`,
        ctx,
      )

      return { success: true, data: activity }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
