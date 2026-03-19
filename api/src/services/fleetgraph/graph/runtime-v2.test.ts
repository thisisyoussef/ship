import { MemorySaver } from '@langchain/langgraph'
import { describe, expect, it, vi } from 'vitest'

import type { FleetGraphFindingActionStore } from '../actions/types.js'
import type { FleetGraphFindingStore } from '../findings/types.js'
import type { FleetGraphV2RuntimeInput } from './types-v2.js'
import { createFleetGraphV2Runtime } from './index.js'

const BASE_URL = 'https://ship.test'
const WORKSPACE_ID = 'workspace-1'
const USER_ID = 'user-1'
const PERSON_ID = 'person-1'
const WEEK_ID = 'week-1'

function createActionStoreMock(): FleetGraphFindingActionStore {
  const beginExecution = vi.fn(async (
    input: Parameters<FleetGraphFindingActionStore['beginExecution']>[0],
  ) => ({
    execution: {
      actionType: input.actionType,
      attemptCount: 1,
      endpoint: input.endpoint,
      findingId: input.findingId,
      message: 'Pending execution.',
      status: 'pending' as const,
      updatedAt: new Date('2026-03-19T12:00:00.000Z'),
    },
    shouldExecute: true,
  }))
  const finishExecution = vi.fn(async (
    input: Parameters<FleetGraphFindingActionStore['finishExecution']>[0],
  ) => ({
    actionType: input.actionType,
    appliedAt: input.appliedAt,
    attemptCount: 1,
    endpoint: input.endpoint,
    findingId: input.findingId,
    message: input.message,
    resultStatusCode: input.resultStatusCode,
    status: input.status,
    updatedAt: new Date('2026-03-19T12:05:00.000Z'),
  }))

  return {
    beginExecution,
    beginStartWeekExecution(input) {
      return beginExecution({ ...input, actionType: 'start_week' })
    },
    finishExecution,
    finishStartWeekExecution(input) {
      return finishExecution({ ...input, actionType: 'start_week' })
    },
    listExecutionsForFindings: vi.fn(async () => []),
  }
}

function createFindingStoreMock(): FleetGraphFindingStore {
  return {
    dismissFinding: vi.fn(async () => null),
    getFindingById: vi.fn(async () => null),
    getFindingByKey: vi.fn(async () => null),
    listActiveFindings: vi.fn(async () => []),
    resolveFinding: vi.fn(async () => null),
    snoozeFinding: vi.fn(async () => null),
    upsertFinding: vi.fn(),
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
    },
    status,
  })
}

function createFetchFn(routes: Record<string, unknown>) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

    if (!(url in routes)) {
      return new Response('Not Found', { status: 404 })
    }

    return jsonResponse(routes[url])
  }) as typeof fetch
}

function createRuntime(fetchFn: typeof fetch) {
  return createFleetGraphV2Runtime({
    actionStore: createActionStoreMock(),
    checkpointer: new MemorySaver(),
    fetchConfig: {
      baseUrl: BASE_URL,
      fetchFn,
      requestContext: {
        baseUrl: BASE_URL,
        cookieHeader: 'session=demo',
        csrfToken: 'csrf-demo',
      },
      token: '',
    },
    findingStore: createFindingStoreMock(),
  })
}

function makeAnalyzeInput(): FleetGraphV2RuntimeInput {
  return {
    actorId: USER_ID,
    activeTab: null,
    documentId: WEEK_ID,
    documentType: 'sprint' as const,
    dirtyCoalescedIds: [],
    dirtyEntityId: null,
    dirtyEntityType: null,
    dirtyWriteType: null,
    mode: 'on_demand',
    nestedPath: null,
    projectContextId: null,
    selectedActionId: null,
    threadId: `fleetgraph:${WORKSPACE_ID}:analyze:${WEEK_ID}`,
    triggerSource: 'document-page',
    triggerType: 'user_chat' as const,
    userQuestion: null,
    viewerUserId: USER_ID,
    workspaceId: WORKSPACE_ID,
  }
}

function makeWeekRoutes(overrides: {
  issueDocuments?: unknown[]
  weekDocument?: Record<string, unknown>
  weekResource?: Record<string, unknown>
} = {}) {
  return {
    [`${BASE_URL}/api/workspaces/current`]: {
      user: {
        id: USER_ID,
        is_admin: false,
      },
    },
    [`${BASE_URL}/api/team/people`]: [
      {
        email: 'pm@example.com',
        id: PERSON_ID,
        name: 'Casey PM',
        role: 'PM',
        user_id: USER_ID,
      },
    ],
    [`${BASE_URL}/api/documents/${WEEK_ID}`]: {
      belongs_to: [
        {
          id: 'project-1',
          title: 'Demo Project',
          type: 'project',
        },
      ],
      documentType: 'sprint',
      id: WEEK_ID,
      owner_id: PERSON_ID,
      properties: {
        assignee_ids: [PERSON_ID],
        sprint_number: 2,
        status: 'planning',
      },
      status: 'planning',
      title: 'FleetGraph Demo Week',
      ...overrides.weekDocument,
    },
    [`${BASE_URL}/api/weeks/${WEEK_ID}`]: {
      id: WEEK_ID,
      issue_count: Array.isArray(overrides.issueDocuments)
        ? overrides.issueDocuments.length
        : 0,
      name: 'FleetGraph Demo Week',
      owner: {
        id: USER_ID,
        name: 'Casey PM',
      },
      sprint_number: 2,
      status: 'planning',
      workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
      ...overrides.weekResource,
    },
    [`${BASE_URL}/api/weeks/${WEEK_ID}/issues`]: overrides.issueDocuments ?? [],
    [`${BASE_URL}/api/weeks/${WEEK_ID}/review`]: null,
    [`${BASE_URL}/api/weeks/${WEEK_ID}/scope-changes`]: [],
    [`${BASE_URL}/api/weeks/${WEEK_ID}/standups`]: [],
  }
}

describe('createFleetGraphV2Runtime on-demand parity', () => {
  it('does not quiet-exit when a sprint is still planning after its start window', async () => {
    const runtime = createRuntime(createFetchFn(makeWeekRoutes()))

    const state = await runtime.invoke(makeAnalyzeInput())

    expect(state.branch).toBe('action_required')
    expect(state.reasonedFindings?.map((finding) => finding.findingType)).toContain(
      'week_start_drift'
    )
    expect(state.actionDrafts[0]?.actionType).toBe('start_week')
    expect(state.responsePayload?.type).not.toBe('chat_answer')
  })

  it('stays quiet for a healthy active sprint with scoped work', async () => {
    const runtime = createRuntime(createFetchFn(makeWeekRoutes({
      issueDocuments: [
        {
          id: 'issue-1',
          priority: 'high',
          state: 'in_progress',
          title: 'Fix the launch blocker',
        },
      ],
      weekDocument: {
        properties: {
          assignee_ids: [PERSON_ID],
          sprint_number: 2,
          status: 'active',
        },
        status: 'active',
      },
      weekResource: {
        issue_count: 1,
        status: 'active',
      },
    })))

    const state = await runtime.invoke(makeAnalyzeInput())

    expect(state.branch).toBe('quiet')
    expect(state.responsePayload).toMatchObject({
      type: 'chat_answer',
      answer: {
        text: 'I analyzed this sprint and did not find anything that needs immediate attention.',
      },
    })
  })

  it('recomputes week-start drift on repeated analyze runs for the same thread', async () => {
    const routes = makeWeekRoutes()
    const runtime = createRuntime(createFetchFn(routes))
    const input = makeAnalyzeInput()

    const initialState = await runtime.invoke(input)

    expect(initialState.branch).toBe('action_required')
    expect(initialState.reasonedFindings?.map((finding) => finding.findingType)).toContain(
      'week_start_drift'
    )

    routes[`${BASE_URL}/api/documents/${WEEK_ID}`] = {
      belongs_to: [
        {
          id: 'project-1',
          title: 'Demo Project',
          type: 'project',
        },
      ],
      documentType: 'sprint',
      id: WEEK_ID,
      owner_id: PERSON_ID,
      properties: {
        assignee_ids: [PERSON_ID],
        sprint_number: 2,
        status: 'active',
      },
      status: 'active',
      title: 'FleetGraph Demo Week',
    }
    routes[`${BASE_URL}/api/weeks/${WEEK_ID}`] = {
      id: WEEK_ID,
      issue_count: 1,
      name: 'FleetGraph Demo Week',
      owner: {
        id: USER_ID,
        name: 'Casey PM',
      },
      sprint_number: 2,
      status: 'active',
      workspace_sprint_start_date: '2026-03-10T00:00:00.000Z',
    }
    routes[`${BASE_URL}/api/weeks/${WEEK_ID}/issues`] = [
      {
        id: 'issue-1',
        priority: 'high',
        state: 'in_progress',
        title: 'Fix the launch blocker',
      },
    ]

    const nextState = await runtime.invoke(input)

    expect(nextState.branch).toBe('quiet')
    expect(nextState.actionDrafts).toEqual([])
    expect(nextState.pendingApproval).toBeNull()
    expect(nextState.reasonedFindings).toBeNull()
    expect(nextState.responsePayload).toMatchObject({
      type: 'chat_answer',
      answer: {
        text: 'I analyzed this sprint and did not find anything that needs immediate attention.',
      },
    })
  })
})
