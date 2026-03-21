import { z } from 'zod'
import type { AnalysisTool, ToolContext, ToolResult } from '../types.js'

export const analysisContextTool: AnalysisTool = {
  name: 'analysis_context_get',
  description:
    'Get the current analysis page context — what entity the user is viewing, active filters, date range, and visible metrics. Call this first to understand what the user is looking at.',
  parameters: z.object({}),

  async execute(_args: unknown, ctx: ToolContext): Promise<ToolResult> {
    try {
      return { success: true, data: ctx.analysisContext }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
