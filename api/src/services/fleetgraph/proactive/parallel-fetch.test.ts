import { describe, expect, it, vi } from 'vitest'

import {
  fetchActorAndRoles,
  fetchProjectCluster,
  fetchWeekCluster,
  fetchWorkspaceSnapshot,
} from './parallel-fetch.js'

describe('FleetGraph parallel fetch', () => {
  it('uses /api/team/people for actor hydration and normalizes actor ids to auth user ids', async () => {
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.endsWith('/api/workspaces/current')) {
        return new Response(JSON.stringify({
          user: {
            id: 'user-1',
            is_admin: true,
          },
        }))
      }

      if (url.endsWith('/api/team/people')) {
        return new Response(JSON.stringify([
          {
            id: 'person-doc-1',
            user_id: 'user-1',
            name: 'Alice PM',
            role: 'PM',
            reportsTo: 'user-9',
          },
        ]))
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const result = await fetchActorAndRoles('user-1', {
      baseUrl: 'https://ship-demo-staging.up.railway.app',
      fetchFn,
      token: 'token',
    })

    expect(result.errors).toEqual([])
    expect(result.isAdmin).toBe(true)
    expect(result.actorPerson).toEqual(expect.objectContaining({
      id: 'user-1',
      name: 'Alice PM',
      properties: expect.objectContaining({
        personDocumentId: 'person-doc-1',
      }),
      reportsTo: 'user-9',
      role: 'PM',
    }))
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('/api/people'))).toBe(false)
  })

  it('uses /api/team/people for week analysis fetches and preserves person ids that match issue assignees', async () => {
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.endsWith('/api/weeks/week-1')) {
        return new Response(JSON.stringify({
          id: 'week-1',
          issue_count: 1,
          name: 'Week 14',
          owner: {
            id: 'user-1',
            name: 'Alice PM',
          },
          sprint_number: 2,
          status: 'planning',
          workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
        }))
      }

      if (url.endsWith('/api/weeks/week-1/issues')) {
        return new Response(JSON.stringify([
          {
            id: 'issue-1',
            assignee_id: 'user-1',
            title: 'Fix login',
          },
        ]))
      }

      if (url.endsWith('/api/weeks/week-1/standups')) {
        return new Response(JSON.stringify([]))
      }

      if (url.endsWith('/api/weeks/week-1/review')) {
        return new Response(JSON.stringify({ status: 'pending' }))
      }

      if (url.endsWith('/api/weeks/week-1/scope-changes')) {
        return new Response(JSON.stringify([]))
      }

      if (url.endsWith('/api/team/people')) {
        return new Response(JSON.stringify([
          {
            id: 'person-doc-1',
            user_id: 'user-1',
            name: 'Alice PM',
          },
        ]))
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const result = await fetchWeekCluster('week-1', {
      baseUrl: 'https://ship-demo-staging.up.railway.app',
      fetchFn,
      token: 'token',
    })

    expect(result.errors).toEqual([])
    expect(result.cluster?.week).toEqual(expect.objectContaining({
      ownerId: 'user-1',
      sprintStartDate: '2026-03-17T00:00:00.000Z',
      title: 'Week 14',
    }))
    expect(result.cluster?.issues).toEqual([
      expect.objectContaining({
        assigneeId: 'user-1',
        sprintId: 'week-1',
      }),
    ])
    expect(result.cluster?.relatedPeople).toEqual([
      expect.objectContaining({
        id: 'user-1',
        name: 'Alice PM',
        properties: expect.objectContaining({
          personDocumentId: 'person-doc-1',
        }),
      }),
    ])
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('/api/people'))).toBe(false)
  })

  it('uses native project routes for project analysis fetches', async () => {
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.endsWith('/api/projects/project-1')) {
        return new Response(JSON.stringify({
          accountable_id: 'user-9',
          id: 'project-1',
          owner_id: 'user-1',
          target_date: '2026-03-25T00:00:00.000Z',
          title: 'Launch project',
        }))
      }

      if (url.endsWith('/api/projects/project-1/issues')) {
        return new Response(JSON.stringify([
          {
            assignee_id: 'user-1',
            id: 'issue-1',
            priority: 'high',
            state: 'in_progress',
            title: 'Ship the launch fix',
          },
        ]))
      }

      if (url.endsWith('/api/projects/project-1/weeks')) {
        return new Response(JSON.stringify([
          {
            id: 'week-1',
            issue_count: 1,
            name: 'Week 14',
            owner: {
              id: 'user-1',
              name: 'Alice PM',
            },
            sprint_number: 2,
            status: 'active',
            workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
          },
        ]))
      }

      if (url.endsWith('/api/projects/project-1/retro')) {
        return new Response(JSON.stringify({ outcome: 'good' }))
      }

      if (url.endsWith('/api/activity/project/project-1')) {
        return new Response(JSON.stringify([]))
      }

      if (url.endsWith('/api/team/people')) {
        return new Response(JSON.stringify([
          {
            id: 'person-doc-1',
            user_id: 'user-1',
            name: 'Alice PM',
          },
        ]))
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const result = await fetchProjectCluster('project-1', {
      baseUrl: 'https://ship-demo-staging.up.railway.app',
      fetchFn,
      token: 'token',
    })

    expect(result.errors).toEqual([])
    expect(result.cluster?.project).toEqual(expect.objectContaining({
      accountableId: 'user-9',
      id: 'project-1',
      ownerId: 'user-1',
      targetDate: '2026-03-25T00:00:00.000Z',
    }))
    expect(result.cluster?.issues).toEqual([
      expect.objectContaining({
        projectId: 'project-1',
      }),
    ])
    expect(result.cluster?.weeks).toEqual([
      expect.objectContaining({
        projectId: 'project-1',
      }),
    ])
  })

  it('uses /api/team/people for proactive workspace snapshots', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.endsWith('/api/projects')) {
        return new Response(JSON.stringify([
          {
            id: 'project-1',
            target_date: '2026-03-25T00:00:00.000Z',
            title: 'Project 1',
          },
        ]))
      }

      if (url.endsWith('/api/weeks')) {
        return new Response(JSON.stringify({
          weeks: [{
            id: 'week-1',
            issue_count: 0,
            name: 'Week 1',
            sprint_number: 1,
            status: 'planning',
            workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
          }],
        }))
      }

      if (url.endsWith('/api/issues')) {
        return new Response(JSON.stringify([
          {
            belongs_to: [
              { id: 'project-1', type: 'project' },
              { id: 'week-1', type: 'sprint' },
            ],
            id: 'issue-1',
            state: 'in_progress',
            title: 'Issue 1',
          },
        ]))
      }

      if (url.endsWith('/api/team/people')) {
        return new Response(JSON.stringify([
          {
            id: 'person-doc-1',
            user_id: 'user-1',
            name: 'Alice PM',
          },
        ]))
      }

      if (url.endsWith('/api/accountability/action-items')) {
        return new Response(JSON.stringify({ items: [] }))
      }

      if (url.includes('/api/documents?document_type=standup')) {
        return new Response(JSON.stringify({
          documents: [
            {
              id: 'standup-1',
              title: 'Daily standup',
              properties: { author_id: 'user-1', date: today },
            },
          ],
        }))
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const snapshot = await fetchWorkspaceSnapshot({
      baseUrl: 'https://ship-demo-staging.up.railway.app',
      fetchFn,
      token: 'token',
    })

    expect(snapshot.fetchErrors).toEqual([])
    expect(snapshot.partialData).toBe(false)
    expect(snapshot.projects).toEqual([
      expect.objectContaining({
        targetDate: '2026-03-25T00:00:00.000Z',
      }),
    ])
    expect(snapshot.weeks).toEqual([
      expect.objectContaining({
        sprintStartDate: '2026-03-10T00:00:00.000Z',
      }),
    ])
    expect(snapshot.issues).toEqual([
      expect.objectContaining({
        projectId: 'project-1',
        sprintId: 'week-1',
      }),
    ])
    expect(snapshot.people).toEqual([
      expect.objectContaining({
        id: 'user-1',
        name: 'Alice PM',
      }),
    ])
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('/api/people'))).toBe(false)
  })
})
