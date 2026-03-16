import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLLMAdapter,
  resolveLLMConfig,
  type FleetGraphEnv,
} from './factory.js';

function makeEnv(overrides: Partial<FleetGraphEnv> = {}): FleetGraphEnv {
  return {
    FLEETGRAPH_LLM_PROVIDER: undefined,
    OPENAI_API_KEY: undefined,
    OPENAI_BASE_URL: undefined,
    FLEETGRAPH_OPENAI_MODEL: undefined,
    AWS_REGION: undefined,
    AWS_ACCESS_KEY_ID: undefined,
    AWS_SECRET_ACCESS_KEY: undefined,
    AWS_SESSION_TOKEN: undefined,
    FLEETGRAPH_BEDROCK_MODEL_ID: undefined,
    ...overrides,
  };
}

describe('FleetGraph LLM factory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to OpenAI when provider is unset', () => {
    const config = resolveLLMConfig(
      makeEnv({
        OPENAI_API_KEY: 'test-openai-key',
      })
    );

    expect(config.provider).toBe('openai');
    expect(config.openai.model).toBe('gpt-5-mini');
  });

  it('rejects missing OpenAI credentials for the default provider', () => {
    expect(() => resolveLLMConfig(makeEnv())).toThrowError(
      'OPENAI_API_KEY is required when FleetGraph uses the OpenAI provider.'
    );
  });

  it('supports switching to the Bedrock Anthropic adapter without OpenAI credentials', () => {
    const config = resolveLLMConfig(
      makeEnv({
        FLEETGRAPH_LLM_PROVIDER: 'bedrock-anthropic',
      })
    );

    expect(config.provider).toBe('bedrock-anthropic');
    expect(config.bedrockAnthropic.region).toBe('us-east-1');
  });

  it('creates an OpenAI adapter that calls the Responses API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-5-mini',
        output_text: 'hello from openai',
        usage: {
          input_tokens: 10,
          output_tokens: 4,
          total_tokens: 14,
        },
      }),
    });

    const adapter = createLLMAdapter(
      resolveLLMConfig(
        makeEnv({
          OPENAI_API_KEY: 'test-openai-key',
        })
      ),
      { fetchFn: fetchMock as typeof fetch }
    );

    const result = await adapter.generate({
      input: 'Summarize the sprint risks.',
      instructions: 'Be concise.',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openai-key',
        }),
      })
    );
    expect(result).toEqual({
      model: 'gpt-5-mini',
      provider: 'openai',
      text: 'hello from openai',
      usage: {
        inputTokens: 10,
        outputTokens: 4,
        totalTokens: 14,
      },
    });
  });

  it('creates a Bedrock Anthropic adapter that invokes the Anthropic messages payload', async () => {
    const send = vi.fn().mockResolvedValue({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ text: 'hello from bedrock' }],
          usage: {
            input_tokens: 12,
            output_tokens: 8,
          },
        })
      ),
    });

    const adapter = createLLMAdapter(
      resolveLLMConfig(
        makeEnv({
          FLEETGRAPH_LLM_PROVIDER: 'bedrock-anthropic',
        })
      ),
      {
        bedrockClient: {
          send,
        },
      }
    );

    const result = await adapter.generate({
      input: 'Summarize the sprint risks.',
      instructions: 'Be concise.',
      maxOutputTokens: 200,
      temperature: 0.2,
    });

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]?.[0] as { input?: { body?: Uint8Array } };
    const payload = JSON.parse(new TextDecoder().decode(command.input?.body));
    expect(payload).toMatchObject({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 200,
      system: 'Be concise.',
      temperature: 0.2,
    });
    expect(result).toEqual({
      model: 'global.anthropic.claude-opus-4-5-20251101-v1:0',
      provider: 'bedrock-anthropic',
      text: 'hello from bedrock',
      usage: {
        inputTokens: 12,
        outputTokens: 8,
        totalTokens: 20,
      },
    });
  });
});
