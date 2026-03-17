import {
  ShipWeeksResponseSchema,
  type FleetGraphShipApiClient,
} from './types.js'

export interface FleetGraphShipApiEnv {
  APP_BASE_URL?: string
  FLEETGRAPH_API_TOKEN?: string
}

interface FleetGraphShipApiConfig {
  baseUrl: string
  token: string
}

export function resolveFleetGraphShipApiConfig(
  env: FleetGraphShipApiEnv | NodeJS.ProcessEnv = process.env
): FleetGraphShipApiConfig {
  const baseUrl = trimUrl(env.APP_BASE_URL)
  const token = env.FLEETGRAPH_API_TOKEN?.trim()

  if (!baseUrl) {
    throw new Error('APP_BASE_URL is required for FleetGraph Ship REST access.')
  }

  if (!token) {
    throw new Error('FLEETGRAPH_API_TOKEN is required for FleetGraph proactive Ship REST access.')
  }

  return { baseUrl, token }
}

export function createFleetGraphShipApiClient(
  config: FleetGraphShipApiConfig,
  deps: { fetchFn?: typeof fetch } = {}
): FleetGraphShipApiClient {
  const fetchFn = deps.fetchFn ?? fetch

  return {
    async listWeeks() {
      const response = await fetchFn(`${config.baseUrl}/api/weeks`, {
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`FleetGraph Ship weeks request failed with ${response.status}.`)
      }

      return ShipWeeksResponseSchema.parse(await response.json())
    },
  }
}

function trimUrl(value?: string) {
  const normalized = value?.trim()
  if (!normalized) {
    return undefined
  }
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}
