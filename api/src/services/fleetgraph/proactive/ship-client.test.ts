import { describe, expect, it } from 'vitest'

import { createFleetGraphShipApiClient } from './ship-client.js'

describe('FleetGraph Ship API client', () => {
  it('accepts the real Ship weeks response shape and normalizes sprint start metadata', async () => {
    const client = createFleetGraphShipApiClient(
      {
        baseUrl: 'https://ship-demo-production.up.railway.app',
        token: 'token',
      },
      {
        fetchFn: async () => new Response(JSON.stringify({
          current_sprint_number: 14,
          days_remaining: 6,
          sprint_end_date: '2026-03-22',
          sprint_start_date: '2026-03-16',
          weeks: [
            {
              completed_count: 0,
              days_remaining: 6,
              has_plan: false,
              id: 'week-1',
              issue_count: 0,
              name: 'FleetGraph Demo Week - Worker Generated',
              owner: null,
              program_id: 'program-1',
              program_name: 'Ship Core',
              sprint_number: 14,
              started_count: 0,
              status: 'active',
              workspace_sprint_start_date: '2025-12-15T00:00:00.000Z',
            },
          ],
        })),
      }
    )

    await expect(client.listWeeks()).resolves.toEqual({
      weeks: [
        expect.objectContaining({
          id: 'week-1',
          issue_count: 0,
          name: 'FleetGraph Demo Week - Worker Generated',
          status: 'active',
          workspace_sprint_start_date: '2025-12-15T00:00:00.000Z',
        }),
      ],
      workspace_sprint_start_date: '2025-12-15T00:00:00.000Z',
    })
  })
})
