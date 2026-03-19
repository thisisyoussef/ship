import { describe, expect, it, vi } from 'vitest'

import {
  fetchActorAndRoles,
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

      if (url.endsWith('/api/documents/week-1')) {
        return new Response(JSON.stringify({
          id: 'week-1',
          title: 'Week 14',
          properties: { owner_id: 'user-1' },
        }))
      }

      if (url.includes('/api/documents?document_type=issue&sprint_id=week-1')) {
        return new Response(JSON.stringify({
          documents: [
            {
              id: 'issue-1',
              title: 'Fix login',
              properties: { assignee_id: 'user-1' },
            },
          ],
        }))
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

  it('uses /api/team/people for proactive workspace snapshots', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/api/documents?document_type=project')) {
        return new Response(JSON.stringify({ documents: [{ id: 'project-1', title: 'Project 1' }] }))
      }

      if (url.endsWith('/api/weeks')) {
        return new Response(JSON.stringify({ weeks: [{ id: 'week-1', title: 'Week 1' }] }))
      }

      if (url.includes('/api/documents?document_type=issue')) {
        return new Response(JSON.stringify({ documents: [{ id: 'issue-1', title: 'Issue 1' }] }))
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
    expect(snapshot.people).toEqual([
      expect.objectContaining({
        id: 'user-1',
        name: 'Alice PM',
      }),
    ])
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes('/api/people'))).toBe(false)
  })
})
