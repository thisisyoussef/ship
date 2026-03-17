import { resolveLLMConfig, type FleetGraphEnv } from '../llm/factory.js'
import { resolveFleetGraphTracingSettings } from '../tracing/config.js'
import type { FleetGraphTracingEnv } from '../tracing/types.js'
import type {
  FleetGraphEvidenceChecklist,
  FleetGraphReadinessIssue,
  FleetGraphSurfaceReadiness,
} from './contracts.js'

export interface FleetGraphDeploymentEnv
  extends FleetGraphEnv,
    FleetGraphTracingEnv {
  APP_BASE_URL?: string
  FLEETGRAPH_ENTRY_ENABLED?: string
  FLEETGRAPH_SERVICE_TOKEN?: string
  FLEETGRAPH_WORKER_ENABLED?: string
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
