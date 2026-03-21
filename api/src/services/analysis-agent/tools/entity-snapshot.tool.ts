import { z } from 'zod'
import type { AnalysisTool, ToolContext, ToolResult } from '../types.js'
import { fetchShipApi } from './fetch-ship-api.js'

export const entitySnapshotTool: AnalysisTool = {
  name: 'entity_snapshot_get',
  description:
    'Fetch full details of a Ship entity (sprint, project, issue, program). Returns properties, status, ownership, dates, and associations.',
  parameters: z.object({
    entity_id: z.string(),
    entity_type: z.string().optional(),
  }),

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, entity_type } = args as {
        entity_id: string
        entity_type?: string
      }
      const resolvedType = entity_type ?? ctx.entityType

      // Always fetch the base document
      const document = await fetchShipApi(`/api/documents/${entity_id}`, ctx)

      // Fetch type-specific data in addition
      let typeData: unknown = null
      if (resolvedType === 'sprint') {
        typeData = await fetchShipApi(`/api/weeks/${entity_id}`, ctx).catch(() => null)
      } else if (resolvedType === 'project') {
        typeData = await fetchShipApi(`/api/projects/${entity_id}`, ctx).catch(() => null)
      } else if (resolvedType === 'issue') {
        typeData = await fetchShipApi(`/api/issues/${entity_id}`, ctx).catch(() => null)
      }

      return {
        success: true,
        data: { document, typeData, entity_type: resolvedType },
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
