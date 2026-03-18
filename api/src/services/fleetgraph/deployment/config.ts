import { resolveLLMConfig, type FleetGraphEnv } from '../llm/factory.js'
import type { FleetGraphShipApiEnv } from '../proactive/index.js'
import { resolveFleetGraphTracingSettings } from '../tracing/config.js'
import type { FleetGraphTracingEnv } from '../tracing/types.js'
import type {
  FleetGraphEvidenceChecklist,
  FleetGraphReadinessIssue,
  FleetGraphSurfaceReadiness,
} from './contracts.js'

export interface FleetGraphDeploymentEnv
  extends FleetGraphEnv,
    FleetGraphShipApiEnv,
    FleetGraphTracingEnv {
  APP_BASE_URL?: string
  FLEETGRAPH_ENTRY_ENABLED?: string
  FLEETGRAPH_API_TOKEN?: string
  FLEETGRAPH_SERVICE_TOKEN?: string
  FLEETGRAPH_WORKER_ENABLED?: string
  FLEETGRAPH_V2_ENABLED?: string
  FLEETGRAPH_V2_ROLLOUT_PERCENT?: string
  NODE_ENV?: string
}

interface FleetGraphReadinessPair {
  api: FleetGraphSurfaceReadiness
  worker: FleetGraphSurfaceReadiness
}

interface FleetGraphEvidenceInput {
  publicSmokeUrl?: string
  traceUrl?: string
}

type FleetGraphSurface = 'api' | 'worker'

const DEFAULT_PROVIDER = 'openai'

export function resolveFleetGraphSurfaceReadiness(
  surface: FleetGraphSurface,
  env: FleetGraphDeploymentEnv | NodeJS.ProcessEnv = process.env
): FleetGraphSurfaceReadiness {
  const deploymentEnv = env as FleetGraphDeploymentEnv
  const issues: FleetGraphReadinessIssue[] = []
  const publicBaseUrl = trimUrl(deploymentEnv.APP_BASE_URL)
  const provider = resolveProvider(deploymentEnv, issues)
  const serviceTokenConfigured = Boolean(nonBlank(deploymentEnv.FLEETGRAPH_SERVICE_TOKEN))
  const tracingSettings = resolveFleetGraphTracingSettings(deploymentEnv)

  if (!publicBaseUrl) {
    issues.push({
      key: 'APP_BASE_URL',
      message: 'APP_BASE_URL is required for deployed FleetGraph readiness checks.',
    })
  }

  if (!serviceTokenConfigured) {
    issues.push({
      key: 'FLEETGRAPH_SERVICE_TOKEN',
      message: 'FLEETGRAPH_SERVICE_TOKEN is required for FleetGraph service-auth checks.',
    })
  }

  if (!tracingSettings.enabled) {
    issues.push({
      key: 'LANGSMITH_TRACING',
      message: 'LangSmith tracing must be enabled with a valid API key for FleetGraph deploy readiness.',
    })
  }

  const entryEnabled = isSurfaceEnabled('api', deploymentEnv)
  const workerEnabled = isSurfaceEnabled('worker', deploymentEnv)
  if (surface === 'api' && !entryEnabled) {
    issues.push({
      key: 'FLEETGRAPH_ENTRY_ENABLED',
      message: 'FleetGraph entry must be explicitly enabled for deployed API readiness.',
    })
  }
  if (surface === 'worker' && !workerEnabled) {
    issues.push({
      key: 'FLEETGRAPH_WORKER_ENABLED',
      message: 'FleetGraph worker must be explicitly enabled for deployed worker readiness.',
    })
  }
  if (surface === 'worker' && !nonBlank(deploymentEnv.FLEETGRAPH_API_TOKEN)) {
    issues.push({
      key: 'FLEETGRAPH_API_TOKEN',
      message: 'FLEETGRAPH_API_TOKEN is required for proactive FleetGraph REST access from the worker.',
    })
  }

  return {
    entryEnabled,
    entryUrl: publicBaseUrl ? `${publicBaseUrl}/api/fleetgraph/entry` : undefined,
    issues,
    provider,
    publicBaseUrl,
    ready: issues.length === 0,
    readyUrl: publicBaseUrl ? `${publicBaseUrl}/api/fleetgraph/ready` : undefined,
    serviceAuthConfigured: serviceTokenConfigured,
    surface,
    tracingEnabled: tracingSettings.enabled,
    workerEnabled,
  }
}

export function buildFleetGraphEvidenceChecklist(
  readiness: FleetGraphReadinessPair,
  evidence: FleetGraphEvidenceInput
): FleetGraphEvidenceChecklist {
  const publicSmokeReady = Boolean(nonBlank(evidence.publicSmokeUrl))
  const traceReady = Boolean(nonBlank(evidence.traceUrl))
  const items = [
    {
      id: 'worker-runtime' as const,
      note: readiness.worker.ready
        ? 'Worker readiness contract resolved.'
        : 'Worker readiness contract still has missing requirements.',
      status: readiness.worker.ready ? 'ready' as const : 'missing' as const,
    },
    {
      id: 'public-access-smoke' as const,
      note: publicSmokeReady
        ? `Public smoke evidence: ${evidence.publicSmokeUrl}`
        : 'Attach a deployed FleetGraph smoke URL after verification.',
      status: publicSmokeReady ? 'ready' as const : 'missing' as const,
    },
    {
      id: 'trace-evidence' as const,
      note: traceReady
        ? `Trace evidence: ${evidence.traceUrl}`
        : 'Attach a shared LangSmith trace URL from the deployed surface.',
      status: traceReady ? 'ready' as const : 'missing' as const,
    },
  ]

  return {
    items,
    ready: readiness.api.ready && readiness.worker.ready && publicSmokeReady && traceReady,
  }
}

export function assertFleetGraphSurfaceReadiness(
  surface: FleetGraphSurface,
  env: FleetGraphDeploymentEnv | NodeJS.ProcessEnv = process.env
) {
  const readiness = resolveFleetGraphSurfaceReadiness(surface, env)
  if (readiness.ready) {
    return readiness
  }

  throw new Error(
    readiness.issues.map((issue) => `${issue.key}: ${issue.message}`).join(' ')
  )
}

export function isFleetGraphServiceAuthorized(
  token: string | undefined,
  env: FleetGraphDeploymentEnv | NodeJS.ProcessEnv = process.env
) {
  return Boolean(token) && token === nonBlank((env as FleetGraphDeploymentEnv).FLEETGRAPH_SERVICE_TOKEN)
}

export function isSurfaceEnabled(
  surface: FleetGraphSurface,
  env: FleetGraphDeploymentEnv | NodeJS.ProcessEnv = process.env
) {
  const deploymentEnv = env as FleetGraphDeploymentEnv
  if ((deploymentEnv.NODE_ENV || '').trim().toLowerCase() !== 'production') {
    return true
  }

  return surface === 'api'
    ? isTruthy(deploymentEnv.FLEETGRAPH_ENTRY_ENABLED)
    : isTruthy(deploymentEnv.FLEETGRAPH_WORKER_ENABLED)
}

function resolveProvider(
  env: FleetGraphDeploymentEnv,
  issues: FleetGraphReadinessIssue[]
) {
  try {
    return resolveLLMConfig(env).provider
  } catch (error) {
    issues.push({
      key: 'FLEETGRAPH_LLM_PROVIDER',
      message: error instanceof Error ? error.message : 'FleetGraph LLM configuration is invalid.',
    })
    return (env.FLEETGRAPH_LLM_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase()
  }
}

function isTruthy(value?: string) {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())
}

function nonBlank(value?: string) {
  return value?.trim() || undefined
}

function trimUrl(value?: string) {
  const normalized = nonBlank(value)
  if (!normalized) {
    return undefined
  }
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

// ──────────────────────────────────────────────────────────────────────────────
// V2 Three-Lane Architecture Feature Flag
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Checks if FleetGraph V2 (three-lane architecture) is enabled.
 *
 * V2 can be enabled with gradual rollout using FLEETGRAPH_V2_ROLLOUT_PERCENT.
 * When rollout is configured, a random sample determines eligibility.
 *
 * @param env - Environment variables (defaults to process.env)
 * @param requestId - Optional request/session ID for deterministic rollout
 * @returns true if V2 should be used for this request
 */
export function isFleetGraphV2Enabled(
  env: FleetGraphDeploymentEnv | NodeJS.ProcessEnv = process.env,
  requestId?: string
): boolean {
  const deploymentEnv = env as FleetGraphDeploymentEnv

  // In non-production, check explicit flag (defaults to false)
  if ((deploymentEnv.NODE_ENV || '').trim().toLowerCase() !== 'production') {
    return isTruthy(deploymentEnv.FLEETGRAPH_V2_ENABLED)
  }

  // In production, must be explicitly enabled
  if (!isTruthy(deploymentEnv.FLEETGRAPH_V2_ENABLED)) {
    return false
  }

  // Check rollout percentage
  const rolloutPercent = parseRolloutPercent(deploymentEnv.FLEETGRAPH_V2_ROLLOUT_PERCENT)
  if (rolloutPercent >= 100) {
    return true // 100% rollout
  }

  if (rolloutPercent <= 0) {
    return false // 0% rollout (effectively disabled)
  }

  // Deterministic rollout based on request ID or random
  const hash = requestId ? simpleHash(requestId) : Math.random() * 100
  return hash < rolloutPercent
}

/**
 * Returns V2 readiness info for deployment checks.
 */
export function resolveFleetGraphV2Readiness(
  env: FleetGraphDeploymentEnv | NodeJS.ProcessEnv = process.env
): {
  enabled: boolean
  rolloutPercent: number
} {
  const deploymentEnv = env as FleetGraphDeploymentEnv
  return {
    enabled: isTruthy(deploymentEnv.FLEETGRAPH_V2_ENABLED),
    rolloutPercent: parseRolloutPercent(deploymentEnv.FLEETGRAPH_V2_ROLLOUT_PERCENT),
  }
}

function parseRolloutPercent(value?: string): number {
  const num = parseInt(nonBlank(value) || '100', 10)
  if (isNaN(num)) return 100
  return Math.max(0, Math.min(100, num))
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  // Convert to 0-100 range
  return Math.abs(hash % 100)
}
