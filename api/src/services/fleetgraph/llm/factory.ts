import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

import {
  FLEETGRAPH_LLM_PROVIDERS,
  type FleetGraphLLMProvider,
  type LLMAdapter,
  type LLMGenerateRequest,
  type LLMGenerateResponse,
  type LLMUsage,
} from './types.js';

const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_BEDROCK_REGION = 'us-east-1';
const DEFAULT_BEDROCK_MODEL =
  'global.anthropic.claude-opus-4-5-20251101-v1:0';

export interface FleetGraphEnv {
  AWS_ACCESS_KEY_ID?: string;
  AWS_REGION?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_SESSION_TOKEN?: string;
  FLEETGRAPH_BEDROCK_MODEL_ID?: string;
  FLEETGRAPH_LLM_PROVIDER?: string;
  FLEETGRAPH_OPENAI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
}

interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface BedrockAnthropicConfig {
  model: string;
  region: string;
}

export interface FleetGraphLLMConfig {
  bedrockAnthropic: BedrockAnthropicConfig;
  openai: OpenAIConfig;
  provider: FleetGraphLLMProvider;
}

interface BedrockClientLike {
  send(command: InvokeModelCommand): Promise<{ body?: Uint8Array }>;
}

interface FactoryDependencies {
  bedrockClient?: BedrockClientLike;
  fetchFn?: typeof fetch;
}

export function resolveLLMConfig(
  env: FleetGraphEnv | NodeJS.ProcessEnv = process.env
): FleetGraphLLMConfig {
  const provider = resolveProvider(env.FLEETGRAPH_LLM_PROVIDER);
  const config: FleetGraphLLMConfig = {
    bedrockAnthropic: {
      model: env.FLEETGRAPH_BEDROCK_MODEL_ID || DEFAULT_BEDROCK_MODEL,
      region: env.AWS_REGION || DEFAULT_BEDROCK_REGION,
    },
    openai: {
      apiKey: env.OPENAI_API_KEY?.trim() || '',
      baseUrl: trimTrailingSlash(env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL),
      model: env.FLEETGRAPH_OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    },
    provider,
  };

  // Don't throw here - validate at LLM call time to allow server startup.
  // This enables the server to run with FleetGraph disabled when API keys aren't set.
  return config;
}

export function createLLMAdapter(
  config: FleetGraphLLMConfig,
  deps: FactoryDependencies = {}
): LLMAdapter {
  if (config.provider === 'openai') {
    return new OpenAIResponsesAdapter(config.openai, deps.fetchFn || fetch);
  }

  return new BedrockAnthropicAdapter(
    config.bedrockAnthropic,
    deps.bedrockClient ||
      new BedrockRuntimeClient({ region: config.bedrockAnthropic.region })
  );
}

function resolveProvider(rawProvider?: string): FleetGraphLLMProvider {
  const normalized = rawProvider?.trim().toLowerCase() || 'openai';
  if (
    (FLEETGRAPH_LLM_PROVIDERS as readonly string[]).includes(normalized)
  ) {
    return normalized as FleetGraphLLMProvider;
  }

  throw new Error(
    `Unsupported FleetGraph provider "${rawProvider}". Expected one of: ${FLEETGRAPH_LLM_PROVIDERS.join(
      ', '
    )}.`
  );
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

class OpenAIResponsesAdapter implements LLMAdapter {
  public readonly model: string;
  public readonly provider = 'openai' as const;

  public constructor(
    private readonly config: OpenAIConfig,
    private readonly fetchFn: typeof fetch
  ) {
    this.model = config.model;
  }

  public async generate(
    request: LLMGenerateRequest
  ): Promise<LLMGenerateResponse> {
    if (!this.config.apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required for FleetGraph OpenAI provider.'
      );
    }
    const response = await this.fetchFn(`${this.config.baseUrl}/responses`, {
      body: JSON.stringify({
        input: request.input,
        instructions: request.instructions,
        max_output_tokens: request.maxOutputTokens,
        model: this.config.model,
        temperature: request.temperature,
      }),
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`OpenAI Responses request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as {
      model?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
      output_text?: string;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      };
    };

    const text = extractOpenAIText(payload);
    return {
      model: payload.model || this.config.model,
      provider: this.provider,
      text,
      usage: normalizeUsage(payload.usage),
    };
  }
}

class BedrockAnthropicAdapter implements LLMAdapter {
  public readonly model: string;
  public readonly provider = 'bedrock-anthropic' as const;

  public constructor(
    private readonly config: BedrockAnthropicConfig,
    private readonly client: BedrockClientLike
  ) {
    this.model = config.model;
  }

  public async generate(
    request: LLMGenerateRequest
  ): Promise<LLMGenerateResponse> {
    const command = new InvokeModelCommand({
      body: new TextEncoder().encode(
        JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: request.maxOutputTokens ?? 800,
          messages: [
            {
              content: [{ text: request.input, type: 'text' }],
              role: 'user',
            },
          ],
          system: request.instructions,
          temperature: request.temperature ?? 0,
        })
      ),
      contentType: 'application/json',
      modelId: this.config.model,
    });

    const response = await this.client.send(command);
    const payload = JSON.parse(
      new TextDecoder().decode(response.body || new Uint8Array())
    ) as {
      content?: Array<{ text?: string }>;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    };

    const text = payload.content?.map((item) => item.text || '').join('').trim();
    if (!text) {
      throw new Error('Bedrock Anthropic response did not contain text.');
    }

    const usage = normalizeUsage({
      input_tokens: payload.usage?.input_tokens,
      output_tokens: payload.usage?.output_tokens,
      total_tokens:
        (payload.usage?.input_tokens || 0) + (payload.usage?.output_tokens || 0),
    });

    return {
      model: this.config.model,
      provider: this.provider,
      text,
      usage,
    };
  }
}

function extractOpenAIText(payload: {
  output?: Array<{ content?: Array<{ text?: string }> }>;
  output_text?: string;
}): string {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('OpenAI Responses payload did not contain text.');
  }

  return text;
}

function normalizeUsage(usage?: {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}): LLMUsage | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
  };
}
