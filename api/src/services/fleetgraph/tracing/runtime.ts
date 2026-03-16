import { getCurrentRunTree, traceable } from 'langsmith/traceable';

import type { LLMAdapter, LLMGenerateRequest, LLMGenerateResponse } from '../llm/index.js';
import type {
  CreateTracedLLMAdapterOptions,
  FleetGraphTraceContext,
  FleetGraphTraceLink,
  FleetGraphTraceResult,
  LangSmithClientLike,
  RunFleetGraphTraceParams,
} from './types.js';

const ADAPTER_TRACE_NAME = 'fleetgraph.llm.generate';
const ROOT_TRACE_NAME = 'fleetgraph.run';

export function createTracedLLMAdapter(
  adapter: LLMAdapter,
  options: CreateTracedLLMAdapterOptions
): LLMAdapter {
  if (!options.settings.enabled) {
    return adapter;
  }

  const tracedGenerate = traceable(
    async (request: LLMGenerateRequest) => adapter.generate(request),
    {
      client: options.client as never,
      metadata: {
        model: adapter.model,
        provider: adapter.provider,
        service: 'fleetgraph',
      },
      name: ADAPTER_TRACE_NAME,
      processInputs: (request) => buildInputSnapshot(request),
      processOutputs: (response) => buildResponseSnapshot(response),
      project_name: options.settings.projectName,
      run_type: 'llm',
      tags: ['fleetgraph', `provider:${adapter.provider}`],
      tracingEnabled: options.settings.enabled,
    }
  );

  return {
    ...adapter,
    async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
      return tracedGenerate(request);
    },
  };
}

export async function runFleetGraphTrace(
  params: RunFleetGraphTraceParams,
  deps: {
    client?: LangSmithClientLike;
    getCurrentRunTreeFn?: typeof getCurrentRunTree;
    timerFn?: typeof setTimeout;
    traceableFn?: typeof traceable;
  } = {}
): Promise<FleetGraphTraceResult> {
  if (!params.settings.enabled) {
    return {
      result: await params.adapter.generate(params.request),
      trace: {
        shared: false,
      },
    };
  }

  const trace = deps.traceableFn || traceable;
  const currentRunTree = deps.getCurrentRunTreeFn || getCurrentRunTree;
  const tracedRun = trace(async (request: LLMGenerateRequest) => {
    const result = await params.adapter.generate(request);
    const traceLink = await resolveTraceLink({
      client: deps.client,
      runId: currentRunTree(true)?.id,
      settings: params.settings,
      timerFn: deps.timerFn,
    });

    return {
      result,
      trace: traceLink,
    };
  }, {
    client: deps.client as never,
    metadata: buildRootMetadata(params.context, params.adapter),
    name: ROOT_TRACE_NAME,
    processInputs: () => ({
      ...buildInputSnapshot(params.request),
      branch: params.context.branch,
      mode: params.context.mode,
      outcome: params.context.outcome,
      trigger: params.context.trigger,
      workspace_id: params.context.workspaceId,
    }),
    processOutputs: (response) => ({
      ...buildResponseSnapshot(response.result),
      shared_trace: response.trace.shared,
      trace_run_id: response.trace.runId,
    }),
    project_name: params.settings.projectName,
    run_type: 'chain',
    tags: buildRootTags(params.context, params.adapter),
    tracingEnabled: params.settings.enabled,
  });

  return tracedRun(params.request);
}

function buildInputSnapshot(request: LLMGenerateRequest) {
  return {
    input_length: request.input.length,
    instructions_length: request.instructions.length,
    max_output_tokens: request.maxOutputTokens,
    temperature: request.temperature,
  };
}

function buildResponseSnapshot(response: LLMGenerateResponse) {
  return {
    model: response.model,
    output_length: response.text.length,
    provider: response.provider,
    total_tokens: response.usage?.totalTokens,
  };
}

function buildRootMetadata(
  context: FleetGraphTraceContext,
  adapter: LLMAdapter
) {
  return {
    branch: context.branch,
    document_id: context.documentId,
    mode: context.mode,
    model: adapter.model,
    outcome: context.outcome,
    provider: adapter.provider,
    route_surface: context.routeSurface,
    service: 'fleetgraph',
    trigger: context.trigger,
    workspace_id: context.workspaceId,
  };
}

function buildRootTags(
  context: FleetGraphTraceContext,
  adapter: LLMAdapter
) {
  return [
    'fleetgraph',
    `mode:${context.mode}`,
    `branch:${context.branch}`,
    `outcome:${context.outcome}`,
    `trigger:${context.trigger}`,
    `provider:${adapter.provider}`,
  ];
}

async function resolveTraceLink({
  client,
  runId,
  settings,
  timerFn,
}: {
  client?: LangSmithClientLike;
  runId?: string;
  settings: RunFleetGraphTraceParams['settings'];
  timerFn?: typeof setTimeout;
}): Promise<FleetGraphTraceLink> {
  if (!client || !runId) {
    return {
      runId,
      shared: false,
    };
  }

  await flushPendingTraceBatches(client, settings.flushTimeoutMs, timerFn);
  if (!settings.sharePublicTraces) {
    return {
      runId,
      shared: false,
    };
  }

  try {
    const existingUrl = await client.readRunSharedLink(runId);
    if (existingUrl) {
      return {
        publicUrl: existingUrl,
        runId,
        shared: true,
      };
    }

    return {
      publicUrl: await client.shareRun(runId),
      runId,
      shared: true,
    };
  } catch {
    return {
      runId,
      shared: false,
    };
  }
}

async function flushPendingTraceBatches(
  client: LangSmithClientLike,
  timeoutMs: number,
  timerFn: typeof setTimeout = setTimeout
) {
  const timeout = new Promise<void>((resolve) => {
    timerFn(resolve, timeoutMs);
  });

  try {
    await Promise.race([client.awaitPendingTraceBatches(), timeout]);
  } catch {
    return;
  }
}
