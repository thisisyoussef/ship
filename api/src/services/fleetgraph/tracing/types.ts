import type { LLMAdapter, LLMGenerateRequest, LLMGenerateResponse } from '../llm/index.js';

export interface FleetGraphTracingEnv {
  FLEETGRAPH_LANGSMITH_FLUSH_TIMEOUT_MS?: string;
  FLEETGRAPH_LANGSMITH_SHARE_TRACES?: string;
  LANGCHAIN_API_KEY?: string;
  LANGCHAIN_ENDPOINT?: string;
  LANGCHAIN_PROJECT?: string;
  LANGCHAIN_TRACING?: string;
  LANGCHAIN_TRACING_V2?: string;
  LANGSMITH_API_KEY?: string;
  LANGSMITH_ENDPOINT?: string;
  LANGSMITH_PROJECT?: string;
  LANGSMITH_TRACING?: string;
  LANGSMITH_TRACING_V2?: string;
  LANGSMITH_WEB_URL?: string;
  LANGSMITH_WORKSPACE_ID?: string;
}

export interface FleetGraphTracingSettings {
  apiKey?: string;
  apiUrl?: string;
  enabled: boolean;
  flushTimeoutMs: number;
  projectName: string;
  sharePublicTraces: boolean;
  webUrl?: string;
  workspaceId?: string;
}

export interface FleetGraphTraceContext {
  branch: string;
  documentId?: string;
  mode: string;
  outcome: string;
  routeSurface?: string;
  trigger: string;
  workspaceId: string;
}

export interface FleetGraphTraceLink {
  publicUrl?: string;
  runId?: string;
  shared: boolean;
}

export interface FleetGraphTraceResult {
  result: LLMGenerateResponse;
  trace: FleetGraphTraceLink;
}

export interface LangSmithClientLike {
  awaitPendingTraceBatches(): Promise<void>;
  readRunSharedLink(runId: string): Promise<string | undefined>;
  shareRun(runId: string): Promise<string>;
}

export interface CreateTracedLLMAdapterOptions {
  client?: LangSmithClientLike;
  settings: FleetGraphTracingSettings;
}

export interface RunFleetGraphTraceParams {
  adapter: LLMAdapter;
  context: FleetGraphTraceContext;
  request: LLMGenerateRequest;
  settings: FleetGraphTracingSettings;
}
