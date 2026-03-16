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
