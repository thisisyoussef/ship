import { describe, expect, it } from 'vitest'

import {
  buildFleetGraphEvidenceChecklist,
  resolveFleetGraphSurfaceReadiness,
  type FleetGraphDeploymentEnv,
} from './config.js'

function makeEnv(
  overrides: Partial<FleetGraphDeploymentEnv> = {}
): FleetGraphDeploymentEnv {
  return {
    APP_BASE_URL: 'https://ship-demo-production.up.railway.app',
    FLEETGRAPH_API_TOKEN: 'ship-rest-token',
    FLEETGRAPH_ENTRY_ENABLED: 'true',
    FLEETGRAPH_SERVICE_TOKEN: 'fleetgraph-service-token',
    FLEETGRAPH_WORKER_ENABLED: 'true',
    LANGSMITH_API_KEY: 'ls-test-key',
    LANGSMITH_TRACING: 'true',
    NODE_ENV: 'production',
    OPENAI_API_KEY: 'openai-test-key',
    ...overrides,
  }
}

describe('FleetGraph deployment readiness', () => {
  it('makes the api and worker share the same core deploy contract', () => {
    const api = resolveFleetGraphSurfaceReadiness('api', makeEnv())
    const worker = resolveFleetGraphSurfaceReadiness('worker', makeEnv())

    expect(api.ready).toBe(true)
    expect(worker.ready).toBe(true)
    expect(api.provider).toBe('openai')
    expect(worker.provider).toBe('openai')
    expect(api.publicBaseUrl).toBe('https://ship-demo-production.up.railway.app')
    expect(api.readyUrl).toBe('https://ship-demo-production.up.railway.app/api/fleetgraph/ready')
    expect(worker.readyUrl).toBe('https://ship-demo-production.up.railway.app/api/fleetgraph/ready')
    expect(api.issues).toEqual([])
    expect(worker.issues).toEqual([])
  })

  it('flags missing public url and service auth for both surfaces', () => {
    const env = makeEnv({
      APP_BASE_URL: undefined,
      FLEETGRAPH_SERVICE_TOKEN: undefined,
    })

    const api = resolveFleetGraphSurfaceReadiness('api', env)
    const worker = resolveFleetGraphSurfaceReadiness('worker', env)

    expect(api.ready).toBe(false)
    expect(worker.ready).toBe(false)
    expect(api.issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining(['APP_BASE_URL', 'FLEETGRAPH_SERVICE_TOKEN'])
    )
    expect(worker.issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining(['APP_BASE_URL', 'FLEETGRAPH_SERVICE_TOKEN'])
    )
  })

  it('requires public smoke and trace evidence to complete the checklist', () => {
    const readiness = {
      api: resolveFleetGraphSurfaceReadiness('api', makeEnv()),
      worker: resolveFleetGraphSurfaceReadiness('worker', makeEnv()),
    }

    const incomplete = buildFleetGraphEvidenceChecklist(readiness, {})
    expect(incomplete.ready).toBe(false)
    expect(incomplete.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'public-access-smoke', status: 'missing' }),
        expect.objectContaining({ id: 'trace-evidence', status: 'missing' }),
      ])
    )

    const complete = buildFleetGraphEvidenceChecklist(readiness, {
      publicSmokeUrl: 'https://ship-demo-production.up.railway.app/api/fleetgraph/ready',
      traceUrl: 'https://smith.langchain.com/public/trace/abc123',
    })

    expect(complete.ready).toBe(true)
    expect(complete.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'public-access-smoke', status: 'ready' }),
        expect.objectContaining({ id: 'trace-evidence', status: 'ready' }),
      ])
    )
  })
})
