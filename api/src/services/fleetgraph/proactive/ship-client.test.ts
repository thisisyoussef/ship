import { describe, expect, it, vi } from 'vitest'

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

  it('uses the current Ship session for on-demand document reads when request context is provided', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      id: 'doc-1',
      title: 'Launch planner',
    })))
    const client = createFleetGraphShipApiClient(
      {
        baseUrl: 'https://ship-demo-production.up.railway.app',
        token: 'token',
      },
      { fetchFn }
    )

    await expect(client.fetchDocument(
      'doc-1',
      'project',
      {
        baseUrl: 'https://ship-demo-production.up.railway.app',
        cookieHeader: 'ship_session=demo',
        csrfToken: 'csrf-token',
      }
    )).resolves.toEqual({
      id: 'doc-1',
      title: 'Launch planner',
    })

    expect(fetchFn).toHaveBeenCalledWith(
      'https://ship-demo-production.up.railway.app/api/documents/doc-1',
      expect.objectContaining({
        headers: {
          accept: 'application/json',
          cookie: 'ship_session=demo',
          'x-csrf-token': 'csrf-token',
        },
        method: 'GET',
      })
    )
  })

  it('reads sprint issues from the Ship week-issues endpoint and normalizes assignee state', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify([
      {
        assignee_id: null,
        id: 'issue-1',
        priority: 'high',
        state: 'open',
        title: 'Unassigned issue',
      },
      {
        assignee_id: 'user-2',
        id: 'issue-2',
        priority: 'medium',
        state: 'in_progress',
        title: 'Assigned issue',
      },
    ])))
    const client = createFleetGraphShipApiClient(
      {
        baseUrl: 'https://ship-demo-production.up.railway.app',
        token: 'token',
      },
      { fetchFn }
    )

    await expect(client.listSprintIssues('week-1')).resolves.toEqual({
      issues: [
        {
          assignee_id: null,
          id: 'issue-1',
          status: 'open',
          title: 'Unassigned issue',
        },
        {
          assignee_id: 'user-2',
          id: 'issue-2',
          status: 'in_progress',
          title: 'Assigned issue',
        },
      ],
    })

    expect(fetchFn).toHaveBeenCalledWith(
      'https://ship-demo-production.up.railway.app/api/weeks/week-1/issues',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer token',
        },
        method: 'GET',
      })
    )
  })
})
