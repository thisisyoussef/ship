import type { Request } from 'express'
import { afterEach, describe, expect, it } from 'vitest'

import {
  buildShipRestRequestContext,
  resolveShipRestBaseUrl,
} from './executor.js'

function makeRequest(
  headers: Record<string, string | undefined>
): Pick<Request, 'get' | 'header' | 'protocol'> {
  return {
    get(name: string) {
      return headers[name.toLowerCase()]
    },
    header(name: string) {
      return headers[name.toLowerCase()]
    },
    protocol: 'https',
  } as unknown as Pick<Request, 'get' | 'header' | 'protocol'>
}

describe('FleetGraph Ship REST base URL resolution', () => {
  afterEach(() => {
    delete process.env.SHIP_API_BASE_URL
    delete process.env.APP_BASE_URL
  })

  it('prefers SHIP_API_BASE_URL over forwarded hosts', () => {
    process.env.SHIP_API_BASE_URL = 'https://api.ship.example'

    const request = makeRequest({
      host: 'internal-service.local',
      'x-forwarded-host': 'frontend.ship.example',
      'x-forwarded-proto': 'https',
    })

    expect(resolveShipRestBaseUrl(request)).toBe('https://api.ship.example')
  })

  it('falls back to APP_BASE_URL when no API-specific override exists', () => {
    process.env.APP_BASE_URL = 'https://app.ship.example'

    const request = makeRequest({
      host: 'internal-service.local',
      'x-forwarded-host': 'frontend.ship.example',
      'x-forwarded-proto': 'https',
    })

    expect(resolveShipRestBaseUrl(request)).toBe('https://app.ship.example')
  })

  it('uses the request host before forwarded host when no env override exists', () => {
    const request = makeRequest({
      host: 'api.ship.example',
      'x-forwarded-host': 'frontend.ship.example',
      'x-forwarded-proto': 'https',
    })

    expect(resolveShipRestBaseUrl(request)).toBe('https://api.ship.example')
  })

  it('builds request context with cookies and csrf intact', () => {
    process.env.APP_BASE_URL = 'https://app.ship.example'

    const request = makeRequest({
      cookie: 'ship_session=test',
      host: 'internal-service.local',
      'x-csrf-token': 'csrf-token',
    })

    expect(buildShipRestRequestContext(request)).toEqual({
      baseUrl: 'https://app.ship.example',
      cookieHeader: 'ship_session=test',
      csrfToken: 'csrf-token',
    })
  })
})
