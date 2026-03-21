import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  executeAnalysisTool,
  getToolSchemas,
} = vi.hoisted(() => ({
  executeAnalysisTool: vi.fn(),
  getToolSchemas: vi.fn(() => [
    {
      description: 'Returns the current analysis context.',
      name: 'analysis_context_get',
      parameters: {
        additionalProperties: false,
        properties: {},
        type: 'object',
      },
    },
  ]),
}))

vi.mock('./tool-registry.js', () => ({
  ALL_ANALYSIS_TOOLS: [],
  executeAnalysisTool,
  getToolSchemas,
}))

import { createAnalysisGraphService } from './analysis-graph.service.js'

describe('analysis graph service', () => {
  beforeEach(() => {
    executeAnalysisTool.mockReset()
    getToolSchemas.mockClear()
  })

  it('recovers malformed closing-tag tool calls instead of leaking raw JSON', async () => {
    executeAnalysisTool.mockResolvedValue({
      data: {
        entityTitle: 'Sprint 14',
        issueCount: 3,
        status: 'active',
      },
    })

    const llm = {
      generate: vi.fn()
        .mockResolvedValueOnce({
          text: '{"name":"analysis_context_get","args":{}}</tool_call>',
        })
        .mockResolvedValueOnce({
          text: 'Sprint 14 is active with 3 open issues, so the sprint is running and needs issue follow-up.<followups>["Show related issues"]</followups>',
        })
        .mockResolvedValueOnce({
          text: 'Sprint 14 is active with 3 open issues, so the sprint is running and needs issue follow-up.<followups>["Show related issues"]</followups>',
        }),
    }

    const service = createAnalysisGraphService({
      llm: llm as never,
    })

    const result = await service.run({
      context: {
        entity_id: 'sprint-14',
        entity_title: 'Sprint 14',
        entity_type: 'sprint',
        surface: 'analysis',
      },
      message: 'What is the current status now?',
      recentTurns: [
        { content: 'Start Sprint', role: 'user' },
        { content: 'I applied it.', role: 'assistant' },
      ],
      summary: null,
      toolContext: {
        analysisContext: {
          entity_id: 'sprint-14',
          entity_title: 'Sprint 14',
          entity_type: 'sprint',
          surface: 'analysis',
        },
        entityId: 'sprint-14',
        entityType: 'sprint',
        requestContext: { baseUrl: 'https://ship.test' },
        workspaceId: 'workspace-1',
      },
    })

    expect(executeAnalysisTool).toHaveBeenCalledWith(
      'analysis_context_get',
      {},
      expect.objectContaining({
        entityId: 'sprint-14',
      }),
    )
    expect(result.toolCalls).toHaveLength(1)
    expect(result.response).toBe(
      'Sprint 14 is active with 3 open issues, so the sprint is running and needs issue follow-up.'
    )
    expect(result.response).not.toContain('"name":"analysis_context_get"')
    expect(result.response).not.toContain('</tool_call>')
    expect(result.suggestedFollowups).toEqual(['Show related issues'])
  })
})
