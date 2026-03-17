import { describe, expect, it } from 'vitest'

import { resolveShipRuntimeRole } from './runtime-role.js'

describe('resolveShipRuntimeRole', () => {
  it('defaults to api when unset', () => {
    expect(resolveShipRuntimeRole({})).toBe('api')
  })

  it('accepts the worker role', () => {
    expect(resolveShipRuntimeRole({ SHIP_RUNTIME_ROLE: 'worker' })).toBe('worker')
  })

  it('rejects invalid runtime roles', () => {
    expect(() =>
      resolveShipRuntimeRole({ SHIP_RUNTIME_ROLE: 'scheduler' })
    ).toThrow('SHIP_RUNTIME_ROLE must be "api" or "worker"')
  })
})
