export type ShipRuntimeRole = 'api' | 'worker'

export interface ShipRuntimeRoleEnv {
  SHIP_RUNTIME_ROLE?: string
}

const DEFAULT_ROLE: ShipRuntimeRole = 'api'

export function resolveShipRuntimeRole(
  env: ShipRuntimeRoleEnv | NodeJS.ProcessEnv = process.env
): ShipRuntimeRole {
  const rawRole = env.SHIP_RUNTIME_ROLE?.trim().toLowerCase()
  if (!rawRole) {
    return DEFAULT_ROLE
  }

  if (rawRole === 'api' || rawRole === 'worker') {
    return rawRole
  }

  throw new Error(
    `SHIP_RUNTIME_ROLE must be "api" or "worker", received "${env.SHIP_RUNTIME_ROLE}".`
  )
}
