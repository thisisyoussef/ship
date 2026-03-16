import { Client } from 'langsmith';

import type {
  FleetGraphTracingEnv,
  FleetGraphTracingSettings,
  LangSmithClientLike,
} from './types.js';

const DEFAULT_API_URL = 'https://api.smith.langchain.com';
const DEFAULT_FLUSH_TIMEOUT_MS = 1_000;
const DEFAULT_PROJECT_NAME = 'ship-fleetgraph';
const TRACING_FLAG_KEYS = [
  'LANGSMITH_TRACING',
  'LANGSMITH_TRACING_V2',
  'LANGCHAIN_TRACING',
  'LANGCHAIN_TRACING_V2',
] as const;

export function resolveFleetGraphTracingSettings(
  env: FleetGraphTracingEnv | NodeJS.ProcessEnv = process.env
): FleetGraphTracingSettings {
  const apiKey = firstNonBlank(env, 'LANGSMITH_API_KEY', 'LANGCHAIN_API_KEY');
  const tracingRequested = TRACING_FLAG_KEYS.some((key) => isTruthy(env[key]));

  return {
    apiKey,
    apiUrl:
      firstNonBlank(env, 'LANGSMITH_ENDPOINT', 'LANGCHAIN_ENDPOINT') ||
      DEFAULT_API_URL,
    enabled: tracingRequested && Boolean(apiKey),
    flushTimeoutMs:
      parsePositiveInt(env.FLEETGRAPH_LANGSMITH_FLUSH_TIMEOUT_MS) ||
      DEFAULT_FLUSH_TIMEOUT_MS,
    projectName:
      firstNonBlank(env, 'LANGSMITH_PROJECT', 'LANGCHAIN_PROJECT') ||
      DEFAULT_PROJECT_NAME,
    sharePublicTraces: isTruthy(env.FLEETGRAPH_LANGSMITH_SHARE_TRACES),
    webUrl: firstNonBlank(env, 'LANGSMITH_WEB_URL'),
    workspaceId: firstNonBlank(env, 'LANGSMITH_WORKSPACE_ID'),
  };
}

export function createLangSmithClient(
  settings: FleetGraphTracingSettings,
  deps: {
    clientFactory?: (settings: FleetGraphTracingSettings) => LangSmithClientLike;
  } = {}
): LangSmithClientLike | undefined {
  if (!settings.enabled || !settings.apiKey) {
    return undefined;
  }

  return (deps.clientFactory || defaultClientFactory)(settings);
}

function defaultClientFactory(
  settings: FleetGraphTracingSettings
): LangSmithClientLike {
  return new Client({
    apiKey: settings.apiKey,
    apiUrl: settings.apiUrl,
    webUrl: settings.webUrl,
    workspaceId: settings.workspaceId,
  });
}

function firstNonBlank(
  source: FleetGraphTracingEnv | NodeJS.ProcessEnv,
  ...keys: string[]
): string | undefined {
  const lookup = source as Record<string, string | undefined>;
  for (const key of keys) {
    const value = lookup[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isTruthy(value?: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() || '');
}

function parsePositiveInt(value?: string): number | undefined {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}
