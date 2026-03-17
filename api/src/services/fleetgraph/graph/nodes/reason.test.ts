import { describe, expect, it, vi } from 'vitest';
import { createReasonNode, parseReasonResponse } from './reason.js';

const mockLLM = {
  model: 'test-model',
  provider: 'openai' as const,
  generate: vi.fn(),
};

describe('reason node', () => {
  it('produces findings from LLM response', async () => {
    mockLLM.generate.mockResolvedValue({
      model: 'test-model',
      provider: 'openai',
      text: JSON.stringify({
        analysisText: 'Sprint has 2 stale issues.',
        findings: [
          {
            title: 'Stale issue detected',
            summary: 'Issue-1 has not been updated in 5 days.',
            findingType: 'stale_issue',
            severity: 'warning',
            actionTier: 'A',
            evidence: ['Last update: 5 days ago'],
          },
        ],
        needsDeeperContext: false,
        deeperContextHint: null,
      }),
    });

    const node = createReasonNode({ llm: mockLLM });
    const result = await node({
      analysisFindings: [],
      context: {
        actorId: 'user-1',
        documentId: 'sprint-1',
        documentTitle: 'Week 1',
        documentType: 'sprint',
        surface: 'document-page',
        workspaceId: 'ws-1',
      },
      conversationHistory: [],
      fetchedData: { 'sprint-1': { document: { title: 'Week 1' }, children: [] } },
      mode: 'on_demand',
      turnCount: 0,
    });

    expect(result.analysisText).toBe('Sprint has 2 stale issues.');
    expect(result.analysisFindings).toHaveLength(1);
    expect(result.analysisFindings[0]!.findingType).toBe('stale_issue');
    expect(result.needsDeeperContext).toBe(false);
    expect(result.turnCount).toBe(1);
    expect(result.conversationHistory).toHaveLength(1);
  });

  it('requests deeper context when LLM says so', async () => {
    mockLLM.generate.mockResolvedValue({
      model: 'test-model',
      provider: 'openai',
      text: JSON.stringify({
        analysisText: 'Need to check assignee workloads.',
        findings: [],
        needsDeeperContext: true,
        deeperContextHint: {
          type: 'assignee_workload',
          ids: ['user-1', 'user-2'],
        },
      }),
    });

    const node = createReasonNode({ llm: mockLLM });
    const result = await node({
      analysisFindings: [],
      context: {
        actorId: 'user-1',
        documentId: 'sprint-1',
        documentTitle: 'Week 1',
        documentType: 'sprint',
        surface: 'document-page',
        workspaceId: 'ws-1',
      },
      conversationHistory: [],
      fetchedData: {},
      mode: 'on_demand',
      turnCount: 0,
    });

    expect(result.needsDeeperContext).toBe(true);
    expect(result.deeperContextHint).toEqual({
      type: 'assignee_workload',
      ids: ['user-1', 'user-2'],
    });
  });

  it('includes user message as a conversation turn', async () => {
    mockLLM.generate.mockResolvedValue({
      model: 'test-model',
      provider: 'openai',
      text: JSON.stringify({
        analysisText: 'The blocker is on issue-3.',
        findings: [],
        needsDeeperContext: false,
      }),
    });

    const node = createReasonNode({ llm: mockLLM });
    const result = await node({
      analysisFindings: [],
      context: {
        actorId: 'user-1',
        documentId: 'sprint-1',
        documentTitle: 'Week 1',
        documentType: 'sprint',
        surface: 'document-page',
        workspaceId: 'ws-1',
      },
      conversationHistory: [
        { role: 'assistant', content: 'Initial analysis done.', timestamp: '2026-01-01T00:00:00Z' },
      ],
      fetchedData: {},
      mode: 'on_demand',
      turnCount: 1,
      userMessage: "What's blocking this sprint?",
    });

    expect(result.conversationHistory).toHaveLength(3); // existing + user + assistant
    expect(result.conversationHistory[1]!.role).toBe('user');
    expect(result.conversationHistory[1]!.content).toBe("What's blocking this sprint?");
    expect(result.conversationHistory[2]!.role).toBe('assistant');
    expect(result.turnCount).toBe(2);
  });

  it('proposes pending action from highest-tier finding', async () => {
    mockLLM.generate.mockResolvedValue({
      model: 'test-model',
      provider: 'openai',
      text: JSON.stringify({
        analysisText: 'Week needs to be started.',
        findings: [
          {
            title: 'Week not started',
            summary: 'This week should be active.',
            findingType: 'drift',
            severity: 'warning',
            actionTier: 'C',
            evidence: ['Status is planning, should be active'],
            proposedAction: {
              label: 'Start this week',
              targetId: 'week-1',
              targetType: 'sprint',
              endpoint: { method: 'POST', path: '/api/weeks/week-1/start' },
            },
          },
        ],
        needsDeeperContext: false,
      }),
    });

    const node = createReasonNode({ llm: mockLLM });
    const result = await node({
      analysisFindings: [],
      context: {
        actorId: 'user-1',
        documentId: 'week-1',
        documentTitle: 'Week 1',
        documentType: 'week',
        surface: 'document-page',
        workspaceId: 'ws-1',
      },
      conversationHistory: [],
      fetchedData: {},
      mode: 'on_demand',
      turnCount: 0,
    });

    expect(result.pendingAction).toBeDefined();
    expect(result.pendingAction?.label).toBe('Start this week');
    expect(result.pendingAction?.endpoint.method).toBe('POST');
  });
});

describe('parseReasonResponse', () => {
  it('handles markdown code fences', () => {
    const text = '```json\n{"analysisText":"test","findings":[],"needsDeeperContext":false}\n```';
    const result = parseReasonResponse(text);
    expect(result.analysisText).toBe('test');
  });

  it('falls back to text on invalid JSON', () => {
    const result = parseReasonResponse('Just a plain text response about the sprint.');
    expect(result.analysisText).toBe('Just a plain text response about the sprint.');
    expect(result.findings).toEqual([]);
  });
});
