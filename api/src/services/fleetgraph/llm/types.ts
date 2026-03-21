export const FLEETGRAPH_LLM_PROVIDERS = [
  'openai',
  'bedrock-anthropic',
] as const;

export type FleetGraphLLMProvider =
  (typeof FLEETGRAPH_LLM_PROVIDERS)[number];

export interface LLMGenerateRequest {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface LLMUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface LLMGenerateResponse {
  model: string;
  provider: FleetGraphLLMProvider;
  text: string;
  usage?: LLMUsage;
}

export interface LLMAdapter {
  readonly model: string;
  readonly provider: FleetGraphLLMProvider;
  generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool-Calling Types
// ──────────────────────────────────────────────────────────────────────────────

export interface LLMToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: object; // JSON Schema
  };
}

export interface LLMToolCallingRequest {
  messages: Array<{ role: string; content: string; tool_call_id?: string }>;
  tools: LLMToolSchema[];
  instructions: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export type LLMToolCallingOutputItem =
  | { type: 'text'; text: string }
  | { type: 'function_call'; id: string; name: string; arguments: string };

export interface LLMToolCallingResponse {
  model: string;
  provider: FleetGraphLLMProvider;
  output: LLMToolCallingOutputItem[];
  usage?: LLMUsage;
}

export interface LLMToolCallingAdapter extends LLMAdapter {
  generateWithTools(
    request: LLMToolCallingRequest
  ): Promise<LLMToolCallingResponse>;
}
