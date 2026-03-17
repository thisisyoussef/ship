import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}))

vi.mock('@aws-sdk/client-ssm', () => ({
  GetParameterCommand: class {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  },
  SSMClient: class {
    send = sendMock
  },
}))

import { loadProductionSecrets } from './ssm.js'

const OPTIONAL_KEYS = [
  'FLEETGRAPH_BEDROCK_MODEL_ID',
  'FLEETGRAPH_ENTRY_ENABLED',
  'FLEETGRAPH_EVENT_DEBOUNCE_MS',
  'FLEETGRAPH_LANGSMITH_FLUSH_TIMEOUT_MS',
  'FLEETGRAPH_LANGSMITH_SHARE_TRACES',
  'FLEETGRAPH_LLM_PROVIDER',
  'FLEETGRAPH_MAX_ATTEMPTS',
  'FLEETGRAPH_OPENAI_MODEL',
  'FLEETGRAPH_RETRY_DELAY_MS',
  'FLEETGRAPH_SERVICE_TOKEN',
  'FLEETGRAPH_SWEEP_BATCH_SIZE',
  'FLEETGRAPH_SWEEP_INTERVAL_MS',
  'FLEETGRAPH_WORKER_ENABLED',
  'FLEETGRAPH_WORKER_POLL_INTERVAL_MS',
  'LANGCHAIN_API_KEY',
  'LANGCHAIN_ENDPOINT',
  'LANGCHAIN_PROJECT',
  'LANGCHAIN_TRACING',
  'LANGCHAIN_TRACING_V2',
  'LANGSMITH_API_KEY',
  'LANGSMITH_ENDPOINT',
  'LANGSMITH_PROJECT',
  'LANGSMITH_TRACING',
  'LANGSMITH_TRACING_V2',
  'LANGSMITH_WEB_URL',
  'LANGSMITH_WORKSPACE_ID',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
] as const

describe('loadProductionSecrets', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    sendMock.mockReset()
    vi.restoreAllMocks()
  })

  it('skips optional SSM calls when FleetGraph settings are already explicit', async () => {
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'postgres://render'
    process.env.SESSION_SECRET = 'session-secret'
    process.env.CORS_ORIGIN = 'https://ship-demo.onrender.com'
    process.env.APP_BASE_URL = 'https://ship-demo.onrender.com'
    for (const key of OPTIONAL_KEYS) {
      process.env[key] = `${key.toLowerCase()}-value`
    }

    await expect(loadProductionSecrets()).resolves.toBeUndefined()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('does not crash when optional FleetGraph SSM values are unavailable on non-AWS hosts', async () => {
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'postgres://render'
    process.env.SESSION_SECRET = 'session-secret'
    process.env.CORS_ORIGIN = 'https://ship-demo.onrender.com'
    process.env.APP_BASE_URL = 'https://ship-demo.onrender.com'

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    sendMock.mockRejectedValueOnce(
      Object.assign(new Error('Could not load credentials from any providers'), {
        name: 'CredentialsProviderError',
      })
    )

    await expect(loadProductionSecrets()).resolves.toBeUndefined()
    expect(warning).toHaveBeenCalledWith(
      'Skipping optional FleetGraph/LangSmith SSM loading because AWS credentials are unavailable; continuing with explicit environment variables only.'
    )
  })

  it('still fails when core production config depends on SSM and credentials are missing', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.DATABASE_URL
    delete process.env.SESSION_SECRET
    delete process.env.CORS_ORIGIN

    sendMock.mockRejectedValueOnce(
      Object.assign(new Error('Could not load credentials from any providers'), {
        name: 'CredentialsProviderError',
      })
    )

    await expect(loadProductionSecrets()).rejects.toThrow(
      'Could not load credentials from any providers'
    )
  })
})
