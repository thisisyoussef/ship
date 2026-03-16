import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LLMAdapter, LLMGenerateRequest, LLMGenerateResponse } from '../llm/index.js';
import {
  createTracedLLMAdapter,
  runFleetGraphTrace,
} from './runtime.js';
import type {
  FleetGraphTraceContext,
  FleetGraphTraceLink,
  FleetGraphTracingSettings,
  LangSmithClientLike,
} from './types.js';

const { getCurrentRunTreeMock, traceableMock } = vi.hoisted(() => ({
  getCurrentRunTreeMock: vi.fn(),
  traceableMock: vi.fn(),
}));

vi.mock('langsmith/traceable', () => ({
  getCurrentRunTree: getCurrentRunTreeMock,
  traceable: traceableMock,
}));

function makeAdapter(
  response: LLMGenerateResponse
): LLMAdapter {
  return {
    generate: vi.fn().mockResolvedValue(response),
    model: response.model,
    provider: response.provider,
  };
}

function makeTracingSettings(
  overrides: Partial<FleetGraphTracingSettings> = {}
): FleetGraphTracingSettings {
  return {
    apiKey: 'ls-test-key',
    apiUrl: 'https://api.smith.langchain.com',
    enabled: true,
    flushTimeoutMs: 250,
    projectName: 'ship-fleetgraph',
    sharePublicTraces: true,
    webUrl: undefined,
    workspaceId: 'workspace-123',
    ...overrides,
  };
}

function makeTraceContext(
  overrides: Partial<FleetGraphTraceContext> = {}
): FleetGraphTraceContext {
  return {
    branch: 'quiet',
    mode: 'proactive',
    outcome: 'quiet',
    trigger: 'scheduled-sweep',
    workspaceId: 'workspace-123',
    ...overrides,
  };
}

function makeLangSmithClient(
  overrides: Partial<LangSmithClientLike> = {}
): LangSmithClientLike {
  return {
    awaitPendingTraceBatches: vi.fn().mockResolvedValue(undefined),
    readRunSharedLink: vi.fn().mockResolvedValue(undefined),
    shareRun: vi.fn().mockResolvedValue('https://smith.langchain.com/public/shared-run/r'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  traceableMock.mockImplementation((wrappedFn: (...args: unknown[]) => unknown) => {
    return wrappedFn;
  });
});

describe('createTracedLLMAdapter', () => {
  it('wraps adapter.generate in an llm trace without changing the result', async () => {
    const adapter = makeAdapter({
      model: 'gpt-5-mini',
      provider: 'openai',
      text: 'hello',
      usage: {
        inputTokens: 4,
        outputTokens: 2,
        totalTokens: 6,
      },
    });

    const traced = createTracedLLMAdapter(adapter, {
      settings: makeTracingSettings(),
    });
    const request: LLMGenerateRequest = {
      input: 'Find the risk.',
      instructions: 'Be concise.',
    };

    const response = await traced.generate(request);

    expect(response).toEqual({
      model: 'gpt-5-mini',
      provider: 'openai',
      text: 'hello',
      usage: {
        inputTokens: 4,
        outputTokens: 2,
        totalTokens: 6,
      },
    });
    expect(traceableMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        metadata: expect.objectContaining({
          model: 'gpt-5-mini',
          provider: 'openai',
          service: 'fleetgraph',
        }),
        name: 'fleetgraph.llm.generate',
        run_type: 'llm',
      })
    );
  });
});

describe('runFleetGraphTrace', () => {
  it('stamps workspace, trigger, and branch metadata on the root trace', async () => {
    const adapter = makeAdapter({
      model: 'gpt-5-mini',
      provider: 'openai',
      text: 'quiet',
    });
    const client = makeLangSmithClient({
      readRunSharedLink: vi.fn().mockResolvedValue(
        'https://smith.langchain.com/public/existing-quiet/r'
      ),
    });

    getCurrentRunTreeMock.mockReturnValue({ id: 'run-quiet' });

    const result = await runFleetGraphTrace(
      {
        adapter,
        context: makeTraceContext(),
        request: {
          input: 'Check the project.',
          instructions: 'Return quiet when no action is needed.',
        },
        settings: makeTracingSettings(),
      },
      {
        client,
      }
    );

    expect(result.trace).toEqual<FleetGraphTraceLink>({
      publicUrl: 'https://smith.langchain.com/public/existing-quiet/r',
      runId: 'run-quiet',
      shared: true,
    });
    expect(traceableMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        metadata: expect.objectContaining({
          branch: 'quiet',
          model: 'gpt-5-mini',
          outcome: 'quiet',
          provider: 'openai',
          trigger: 'scheduled-sweep',
          workspace_id: 'workspace-123',
        }),
        name: 'fleetgraph.run',
        run_type: 'chain',
        tags: expect.arrayContaining([
          'fleetgraph',
          'mode:proactive',
          'branch:quiet',
          'outcome:quiet',
          'provider:openai',
        ]),
      })
    );
  });

  it('can create share links for quiet and non-quiet runs', async () => {
    const adapter = makeAdapter({
      model: 'gpt-5-mini',
      provider: 'openai',
      text: 'advisory',
    });
    const client = makeLangSmithClient();

    getCurrentRunTreeMock
      .mockReturnValueOnce({ id: 'run-quiet' })
      .mockReturnValueOnce({ id: 'run-problem' });

    const quietResult = await runFleetGraphTrace(
      {
        adapter,
        context: makeTraceContext(),
        request: {
          input: 'Quiet sweep.',
          instructions: 'Return quiet.',
        },
        settings: makeTracingSettings(),
      },
      {
        client: makeLangSmithClient({
          readRunSharedLink: vi.fn().mockResolvedValue(
            'https://smith.langchain.com/public/existing-quiet/r'
          ),
        }),
      }
    );

    const advisoryResult = await runFleetGraphTrace(
      {
        adapter,
        context: makeTraceContext({
          branch: 'advisory',
          outcome: 'advisory',
        }),
        request: {
          input: 'Advisory sweep.',
          instructions: 'Return an advisory.',
        },
        settings: makeTracingSettings(),
      },
      {
        client,
      }
    );

    expect(quietResult.trace.publicUrl).toBeTruthy();
    expect(advisoryResult.trace.publicUrl).toBe(
      'https://smith.langchain.com/public/shared-run/r'
    );
    expect(client.awaitPendingTraceBatches).toHaveBeenCalledTimes(1);
    expect(client.readRunSharedLink).toHaveBeenCalledWith('run-problem');
    expect(client.shareRun).toHaveBeenCalledWith('run-problem');
  });
});
