import { z } from 'zod'
import type { AnalysisTool, ToolContext, ToolResult } from '../types.js'
import { uuidSchema } from './schemas.js'
import { fetchShipApi } from './fetch-ship-api.js'

export const graphNeighborsTool: AnalysisTool = {
  name: 'graph_neighbors_get',
  description:
    'Fetch related entities — issues in a project or sprint, standups for a sprint, weeks for a project. Use to understand what work is connected to the current entity.',
  parameters: z.object({
    entity_id: uuidSchema,
    entity_type: z.string(),
    relation: z
      .enum(['issues', 'weeks', 'standups', 'children'])
      .optional(),
  }),

  async execute(args: unknown, ctx: ToolContext): Promise<ToolResult> {
    try {
      const { entity_id, entity_type, relation } = args as {
        entity_id: string
        entity_type: string
        relation?: string
      }

      let path: string

      if (relation === 'children' || (!relation && !['project', 'sprint'].includes(entity_type))) {
        path = `/api/documents?parent_id=${entity_id}`
      } else if (entity_type === 'project') {
        if (relation === 'weeks') {
          path = `/api/projects/${entity_id}/weeks`
        } else {
          // default relation for project is issues
          path = `/api/projects/${entity_id}/issues`
        }
      } else if (entity_type === 'sprint') {
        if (relation === 'standups') {
          path = `/api/weeks/${entity_id}/standups`
        } else {
          // default relation for sprint is issues
          path = `/api/weeks/${entity_id}/issues`
        }
      } else {
        path = `/api/documents?parent_id=${entity_id}`
      }

      const data = await fetchShipApi(path, ctx)
      return { success: true, data }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
