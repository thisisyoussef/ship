/**
 * FleetGraph Parallel Fetch Utilities
 *
 * Provides parallel REST fetch patterns for the three-lane architecture.
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for design context.
 */

import type { ShipRestRequestContext } from '../actions/executor.js'
import { logFleetGraph } from '../logging.js'
import {
  normalizeShipIssue,
  normalizeShipIssueList,
  normalizeShipProject,
  normalizeShipProjectList,
  normalizeShipWeek,
  normalizeShipWeekList,
} from './ship-entity-normalizers.js'
import type {
  IssueCluster,
  ProjectCluster,
  ProgramCluster,
  ShipAccountabilityItem,
  ShipDocument,
  ShipIssue,
  ShipPerson,
  ShipProject,
  ShipStandup,
  ShipWeek,
  WeekCluster,
  FetchError,
} from '../graph/types-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface WorkspaceSnapshot {
  projects: ShipProject[]
  weeks: ShipWeek[]
  issues: ShipIssue[]
  people: ShipPerson[]
  accountabilityItems: ShipAccountabilityItem[]
  todayStandups: ShipStandup[]
  fetchErrors: FetchError[]
  partialData: boolean
}

export interface ParallelFetchConfig {
  baseUrl: string
  token: string
  requestContext?: ShipRestRequestContext
  fetchFn?: typeof fetch
  retryCount?: number
  retryDelayMs?: number
}

export interface FetchResult<T> {
  data: T | null
  error: FetchError | null
}

const TEAM_PEOPLE_PATH = '/api/team/people'

type RawShipPeopleResponse =
  | Array<ShipPerson & { user_id?: string | null }>
  | {
    documents?: Array<ShipPerson & { user_id?: string | null }>
    people?: Array<ShipPerson & { user_id?: string | null }>
  }
  | null
  | undefined

// ──────────────────────────────────────────────────────────────────────────────
// Fetch Helpers
// ──────────────────────────────────────────────────────────────────────────────

function buildHeaders(
  config: ParallelFetchConfig
): Record<string, string> {
  if (config.requestContext) {
    const headers: Record<string, string> = {
      accept: 'application/json',
    }
    if (config.requestContext.cookieHeader) {
      headers.cookie = config.requestContext.cookieHeader
    }
    if (config.requestContext.csrfToken) {
      headers['x-csrf-token'] = config.requestContext.csrfToken
    }
    return headers
  }

  if (!config.token) {
    throw new Error(
      'FleetGraph proactive mode requires FLEETGRAPH_API_TOKEN or requestContext.'
    )
  }

  return {
    Authorization: `Bearer ${config.token}`,
    accept: 'application/json',
  }
}

function buildUrl(config: ParallelFetchConfig, path: string): string {
  const baseUrl = config.requestContext?.baseUrl ?? config.baseUrl
  if (!baseUrl) {
    throw new Error('FleetGraph requires baseUrl or requestContext.baseUrl.')
  }
  return `${baseUrl}${path}`
}

function normalizePeople(rawData: RawShipPeopleResponse): ShipPerson[] {
  const rawList = Array.isArray(rawData)
    ? rawData
    : (rawData?.documents ?? rawData?.people ?? [])

  const people = new Map<string, ShipPerson>()

  for (const rawPerson of rawList) {
    const personDocumentId = typeof rawPerson?.id === 'string' ? rawPerson.id : ''
    const userId = typeof rawPerson?.user_id === 'string' && rawPerson.user_id.trim().length > 0
      ? rawPerson.user_id
      : undefined
    const canonicalId = userId ?? personDocumentId
    const name = typeof rawPerson?.name === 'string' ? rawPerson.name : ''

    if (!canonicalId || !name) {
      continue
    }

    const rawProperties = rawPerson.properties && typeof rawPerson.properties === 'object'
      ? rawPerson.properties
      : undefined
    const properties = {
      ...(rawProperties ?? {}),
      ...(personDocumentId && personDocumentId !== canonicalId ? { personDocumentId } : {}),
    }

    people.set(canonicalId, {
      id: canonicalId,
      name,
      email: typeof rawPerson.email === 'string' ? rawPerson.email : undefined,
      role: typeof rawPerson.role === 'string' ? rawPerson.role : undefined,
      reportsTo: typeof rawPerson.reportsTo === 'string' ? rawPerson.reportsTo : undefined,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    })
  }

  return Array.from(people.values())
}

function matchesPersonId(person: ShipPerson, targetId: string): boolean {
  if (person.id === targetId) {
    return true
  }

  return typeof person.properties?.personDocumentId === 'string'
    && person.properties.personDocumentId === targetId
}

async function fetchWithRetry<T>(
  url: string,
  headers: Record<string, string>,
  config: ParallelFetchConfig,
  endpoint: string
): Promise<FetchResult<T>> {
  const fetchFn = config.fetchFn ?? fetch
  const maxRetries = config.retryCount ?? 2
  const baseDelay = config.retryDelayMs ?? 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn(url, {
        headers,
        method: 'GET',
      })

      if (!response.ok) {
        if (attempt < maxRetries && response.status >= 500) {
          // Exponential backoff with jitter for server errors
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        logFleetGraph('warn', 'ship_fetch:error', {
          endpoint,
          message: `HTTP ${response.status}: ${response.statusText}`,
          retryCount: attempt,
          statusCode: response.status,
          url,
        })

        return {
          data: null,
          error: {
            endpoint,
            statusCode: response.status,
            message: `HTTP ${response.status}: ${response.statusText}`,
            retryCount: attempt,
            timestamp: new Date().toISOString(),
          },
        }
      }

      const data = await response.json() as T
      return { data, error: null }
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      logFleetGraph('error', 'ship_fetch:exception', {
        endpoint,
        message: err instanceof Error ? err.message : 'Unknown fetch error',
        retryCount: attempt,
        url,
      })

      return {
        data: null,
        error: {
          endpoint,
          message: err instanceof Error ? err.message : 'Unknown fetch error',
          retryCount: attempt,
          timestamp: new Date().toISOString(),
        },
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    data: null,
    error: {
      endpoint,
      message: 'Max retries exceeded',
      retryCount: maxRetries,
      timestamp: new Date().toISOString(),
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Workspace Snapshot (Proactive Lane)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const now = new Date()
  // toISOString always returns 'YYYY-MM-DDTHH:mm:ss.sssZ' format
  return now.toISOString().slice(0, 10)
}

/**
 * Fetches a complete workspace snapshot with 6 parallel REST calls.
 *
 * Endpoints:
 * - GET /api/projects
 * - GET /api/weeks
 * - GET /api/issues
 * - GET /api/team/people
 * - GET /api/accountability/action-items
 * - GET /api/documents?document_type=standup (filtered to today)
 *
 * Per spec: If projects or weeks fail, the run should route to fallback.
 */
export async function fetchWorkspaceSnapshot(
  config: ParallelFetchConfig
): Promise<WorkspaceSnapshot> {
  const headers = buildHeaders(config)
  const fetchErrors: FetchError[] = []

  const [projectsResult, weeksResult, issuesResult, peopleResult, accountabilityResult, standupsResult] =
    await Promise.all([
      fetchWithRetry<unknown[]>(
        buildUrl(config, '/api/projects'),
        headers,
        config,
        'GET /api/projects'
      ),
      fetchWithRetry<{ weeks?: ShipWeek[] }>(
        buildUrl(config, '/api/weeks'),
        headers,
        config,
        'GET /api/weeks'
      ),
      fetchWithRetry<unknown[]>(
        buildUrl(config, '/api/issues'),
        headers,
        config,
        'GET /api/issues'
      ),
      fetchWithRetry<RawShipPeopleResponse>(
        buildUrl(config, TEAM_PEOPLE_PATH),
        headers,
        config,
        'GET /api/team/people'
      ),
      fetchWithRetry<{ items?: ShipAccountabilityItem[] } | ShipAccountabilityItem[]>(
        buildUrl(config, '/api/accountability/action-items'),
        headers,
        config,
        'GET /api/accountability/action-items'
      ),
      fetchWithRetry<{ documents?: Array<{ id: string; title: string; properties?: { author_id?: string; date?: string }; created_at?: string }> } | Array<{ id: string; title: string; properties?: { author_id?: string; date?: string }; created_at?: string }>>(
        buildUrl(config, '/api/documents?document_type=standup'),
        headers,
        config,
        'GET /api/standups'
      ),
    ])

  // Collect errors
  if (projectsResult.error) fetchErrors.push(projectsResult.error)
  if (weeksResult.error) fetchErrors.push(weeksResult.error)
  if (issuesResult.error) fetchErrors.push(issuesResult.error)
  if (peopleResult.error) fetchErrors.push(peopleResult.error)
  if (accountabilityResult.error) fetchErrors.push(accountabilityResult.error)
  if (standupsResult.error) fetchErrors.push(standupsResult.error)

  // Parse projects
  const projectsRaw = projectsResult.data
  const projects = normalizeShipProjectList(Array.isArray(projectsRaw) ? projectsRaw : [])

  // Parse weeks
  const weeksRaw = weeksResult.data
  const weeks = normalizeShipWeekList(weeksRaw?.weeks ?? [])

  // Parse issues
  const issuesRaw = issuesResult.data
  const issues = normalizeShipIssueList(Array.isArray(issuesRaw) ? issuesRaw : [])

  // Parse people
  const people = normalizePeople(peopleResult.data)

  // Parse accountability
  const accountabilityRaw = accountabilityResult.data
  const accountabilityItems: ShipAccountabilityItem[] = Array.isArray(accountabilityRaw)
    ? accountabilityRaw
    : (accountabilityRaw?.items ?? [])

  // Parse standups and filter to today only
  const today = getTodayDateString()
  const standupsRaw = standupsResult.data
  const allStandups = Array.isArray(standupsRaw)
    ? standupsRaw
    : (standupsRaw?.documents ?? [])

  const todayStandups: ShipStandup[] = allStandups
    .filter((s) => s.properties?.date === today)
    .map((s) => ({
      id: s.id,
      title: s.title,
      authorId: s.properties?.author_id ?? '',
      date: s.properties?.date ?? today,
      createdAt: s.created_at,
    }))

  // Critical failure check: projects or weeks
  const criticalFailure = projectsResult.error !== null || weeksResult.error !== null

  return {
    projects,
    weeks,
    issues,
    people,
    accountabilityItems,
    todayStandups,
    fetchErrors,
    partialData: fetchErrors.length > 0 || criticalFailure,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Issue Cluster (On-Demand Lane)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete issue cluster with 6 parallel REST calls.
 *
 * Endpoints:
 * - GET /api/issues/:id
 * - GET /api/issues/:id/history
 * - GET /api/issues/:id/iterations
 * - GET /api/issues/:id/children
 * - GET /api/documents/:id/comments
 * - GET /api/team/people (if not cached)
 */
export async function fetchIssueCluster(
  issueId: string,
  config: ParallelFetchConfig,
  cachedPeople?: ShipPerson[]
): Promise<{ cluster: IssueCluster | null; errors: FetchError[] }> {
  const headers = buildHeaders(config)
  const errors: FetchError[] = []

  const calls: Promise<FetchResult<unknown>>[] = [
    fetchWithRetry<unknown>(
      buildUrl(config, `/api/documents/${encodeURIComponent(issueId)}`),
      headers,
      config,
      `GET /api/issues/${issueId}`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/issues/${encodeURIComponent(issueId)}/history`),
      headers,
      config,
      `GET /api/issues/${issueId}/history`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/issues/${encodeURIComponent(issueId)}/iterations`),
      headers,
      config,
      `GET /api/issues/${issueId}/iterations`
    ),
    fetchWithRetry<{ documents?: unknown[] } | unknown[]>(
      buildUrl(config, `/api/documents?parent_id=${encodeURIComponent(issueId)}&type=issue`),
      headers,
      config,
      `GET /api/issues/${issueId}/children`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/documents/${encodeURIComponent(issueId)}/comments`),
      headers,
      config,
      `GET /api/documents/${issueId}/comments`
    ),
  ]

  if (!cachedPeople) {
    calls.push(
      fetchWithRetry<RawShipPeopleResponse>(
        buildUrl(config, TEAM_PEOPLE_PATH),
        headers,
        config,
        'GET /api/team/people'
      )
    )
  }

  const results = await Promise.all(calls)

  // Collect errors
  results.forEach((r) => { if (r.error) errors.push(r.error) })

  const issueResult = results[0] as FetchResult<unknown>
  const issue = normalizeShipIssue(issueResult.data)
  if (!issue) {
    return { cluster: null, errors }
  }

  const historyResult = results[1] as FetchResult<unknown[]>
  const iterationsResult = results[2] as FetchResult<unknown[]>
  const childrenRaw = results[3] as FetchResult<{ documents?: unknown[] } | unknown[]>
  const commentsResult = results[4] as FetchResult<unknown[]>

  const childrenData = childrenRaw.data
  const children = normalizeShipIssueList(
    Array.isArray(childrenData) ? childrenData : (childrenData?.documents ?? []),
    {
      projectId: issue.projectId,
      sprintId: issue.sprintId,
    }
  )

  let relatedPeople: ShipPerson[] = cachedPeople ?? []
  if (!cachedPeople && results[5]) {
    relatedPeople = normalizePeople((results[5] as FetchResult<RawShipPeopleResponse>).data)
  }

  return {
    cluster: {
      issue,
      history: historyResult.data ?? [],
      iterations: iterationsResult.data ?? [],
      children,
      comments: commentsResult.data ?? [],
      relatedPeople,
    },
    errors,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Week Cluster (On-Demand Lane)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete week cluster with 6 parallel REST calls.
 *
 * Endpoints:
 * - GET /api/weeks/:id
 * - GET /api/weeks/:id/issues (via documents)
 * - GET /api/weeks/:id/standups
 * - GET /api/weeks/:id/review
 * - GET /api/weeks/:id/scope-changes
 * - GET /api/team/people (if not cached)
 */
export async function fetchWeekCluster(
  weekId: string,
  config: ParallelFetchConfig,
  cachedPeople?: ShipPerson[]
): Promise<{ cluster: WeekCluster | null; errors: FetchError[] }> {
  const headers = buildHeaders(config)
  const errors: FetchError[] = []

  const calls: Promise<FetchResult<unknown>>[] = [
    fetchWithRetry<unknown>(
      buildUrl(config, `/api/weeks/${encodeURIComponent(weekId)}`),
      headers,
      config,
      `GET /api/weeks/${weekId}`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/weeks/${encodeURIComponent(weekId)}/issues`),
      headers,
      config,
      `GET /api/weeks/${weekId}/issues`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/weeks/${encodeURIComponent(weekId)}/standups`),
      headers,
      config,
      `GET /api/weeks/${weekId}/standups`
    ),
    fetchWithRetry<unknown>(
      buildUrl(config, `/api/weeks/${encodeURIComponent(weekId)}/review`),
      headers,
      config,
      `GET /api/weeks/${weekId}/review`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/weeks/${encodeURIComponent(weekId)}/scope-changes`),
      headers,
      config,
      `GET /api/weeks/${weekId}/scope-changes`
    ),
  ]

  if (!cachedPeople) {
    calls.push(
      fetchWithRetry<RawShipPeopleResponse>(
        buildUrl(config, TEAM_PEOPLE_PATH),
        headers,
        config,
        'GET /api/team/people'
      )
    )
  }

  const results = await Promise.all(calls)

  // Collect errors
  results.forEach((r) => { if (r.error) errors.push(r.error) })

  const weekResult = results[0] as FetchResult<unknown>
  const week = normalizeShipWeek(weekResult.data)
  if (!week) {
    return { cluster: null, errors }
  }

  const issuesRaw = (results[1] as FetchResult<unknown[]>).data
  const issues = normalizeShipIssueList(Array.isArray(issuesRaw) ? issuesRaw : [], {
    projectId: week.projectId,
    sprintId: weekId,
  })

  const standupsResult = results[2] as FetchResult<unknown[]>
  const reviewResult = results[3] as FetchResult<unknown>
  const scopeChangesResult = results[4] as FetchResult<unknown[]>

  let relatedPeople: ShipPerson[] = cachedPeople ?? []
  if (!cachedPeople && results[5]) {
    relatedPeople = normalizePeople((results[5] as FetchResult<RawShipPeopleResponse>).data)
  }

  return {
    cluster: {
      week,
      issues,
      standups: standupsResult.data ?? [],
      review: reviewResult.data,
      scopeChanges: scopeChangesResult.data ?? [],
      relatedPeople,
    },
    errors,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Project Cluster (On-Demand Lane)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete project cluster with 6 parallel REST calls.
 *
 * Endpoints:
 * - GET /api/projects/:id
 * - GET /api/projects/:id/issues
 * - GET /api/projects/:id/weeks
 * - GET /api/projects/:id/retro
 * - GET /api/activity/project/:id
 * - GET /api/team/people (if not cached)
 */
export async function fetchProjectCluster(
  projectId: string,
  config: ParallelFetchConfig,
  cachedPeople?: ShipPerson[]
): Promise<{ cluster: ProjectCluster | null; errors: FetchError[] }> {
  const headers = buildHeaders(config)
  const errors: FetchError[] = []

  const calls: Promise<FetchResult<unknown>>[] = [
    fetchWithRetry<unknown>(
      buildUrl(config, `/api/projects/${encodeURIComponent(projectId)}`),
      headers,
      config,
      `GET /api/projects/${projectId}`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/projects/${encodeURIComponent(projectId)}/issues`),
      headers,
      config,
      `GET /api/projects/${projectId}/issues`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/projects/${encodeURIComponent(projectId)}/weeks`),
      headers,
      config,
      `GET /api/projects/${projectId}/weeks`
    ),
    fetchWithRetry<unknown>(
      buildUrl(config, `/api/projects/${encodeURIComponent(projectId)}/retro`),
      headers,
      config,
      `GET /api/projects/${projectId}/retro`
    ),
    fetchWithRetry<unknown[]>(
      buildUrl(config, `/api/activity/project/${encodeURIComponent(projectId)}`),
      headers,
      config,
      `GET /api/activity/project/${projectId}`
    ),
  ]

  if (!cachedPeople) {
    calls.push(
      fetchWithRetry<RawShipPeopleResponse>(
        buildUrl(config, TEAM_PEOPLE_PATH),
        headers,
        config,
        'GET /api/team/people'
      )
    )
  }

  const results = await Promise.all(calls)

  // Collect errors
  results.forEach((r) => { if (r.error) errors.push(r.error) })

  const projectResult = results[0] as FetchResult<unknown>
  const project = normalizeShipProject(projectResult.data)
  if (!project) {
    return { cluster: null, errors }
  }

  const issuesRaw = (results[1] as FetchResult<unknown[]>).data
  const issues = normalizeShipIssueList(Array.isArray(issuesRaw) ? issuesRaw : [], {
    projectId,
  })

  const weeksRaw = (results[2] as FetchResult<unknown[]>).data
  const weeks = normalizeShipWeekList(Array.isArray(weeksRaw) ? weeksRaw : [], {
    projectId,
  })

  const retroResult = results[3] as FetchResult<unknown>
  const activityResult = results[4] as FetchResult<unknown[]>

  let relatedPeople: ShipPerson[] = cachedPeople ?? []
  if (!cachedPeople && results[5]) {
    relatedPeople = normalizePeople((results[5] as FetchResult<RawShipPeopleResponse>).data)
  }

  return {
    cluster: {
      project,
      issues,
      weeks,
      retro: retroResult.data,
      activity: activityResult.data ?? [],
      relatedPeople,
    },
    errors,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Program Cluster (On-Demand Lane)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a complete program cluster.
 *
 * Endpoints:
 * - GET /api/programs/:id
 * - Then fan-out to fetch_project_cluster and fetch_week_cluster for related entities
 */
export async function fetchProgramCluster(
  programId: string,
  config: ParallelFetchConfig,
  cachedPeople?: ShipPerson[]
): Promise<{ cluster: ProgramCluster | null; errors: FetchError[] }> {
  const headers = buildHeaders(config)
  const errors: FetchError[] = []

  // Fetch program document
  const programResult = await fetchWithRetry<ShipDocument>(
    buildUrl(config, `/api/documents/${encodeURIComponent(programId)}`),
    headers,
    config,
    `GET /api/programs/${programId}`
  )

  if (programResult.error) errors.push(programResult.error)
  if (!programResult.data) {
    return { cluster: null, errors }
  }

  // Fetch related projects
  const projectsResult = await fetchWithRetry<unknown[]>(
    buildUrl(config, `/api/programs/${encodeURIComponent(programId)}/projects`),
    headers,
    config,
    `GET /api/programs/${programId}/projects`
  )

  if (projectsResult.error) errors.push(projectsResult.error)

  const projects = normalizeShipProjectList(
    Array.isArray(projectsResult.data) ? projectsResult.data : []
  )

  // Fetch related weeks
  const weeksResult = await fetchWithRetry<{ weeks?: unknown[] }>(
    buildUrl(config, `/api/programs/${encodeURIComponent(programId)}/sprints`),
    headers,
    config,
    `GET /api/programs/${programId}/weeks`
  )

  if (weeksResult.error) errors.push(weeksResult.error)

  const weeks = normalizeShipWeekList(weeksResult.data?.weeks ?? [])

  // Fetch people if not cached
  let relatedPeople: ShipPerson[] = cachedPeople ?? []
  if (!cachedPeople) {
    const peopleResult = await fetchWithRetry<RawShipPeopleResponse>(
      buildUrl(config, TEAM_PEOPLE_PATH),
      headers,
      config,
      'GET /api/team/people'
    )

    if (peopleResult.error) errors.push(peopleResult.error)

    relatedPeople = normalizePeople(peopleResult.data)
  }

  return {
    cluster: {
      program: programResult.data,
      projects,
      weeks,
      relatedPeople,
    },
    errors,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Actor and Roles (On-Demand Lane)
// ──────────────────────────────────────────────────────────────────────────────

export interface ActorAndRolesResult {
  actorPerson: ShipPerson | null
  people: ShipPerson[]
  isAdmin: boolean
  errors: FetchError[]
}

/**
 * Fetches actor information and workspace people.
 *
 * Endpoints:
 * - GET /api/workspaces/current
 * - GET /api/team/people
 */
export async function fetchActorAndRoles(
  actorId: string,
  config: ParallelFetchConfig
): Promise<ActorAndRolesResult> {
  const headers = buildHeaders(config)
  const errors: FetchError[] = []

  const [workspaceResult, peopleResult] = await Promise.all([
    fetchWithRetry<{ user?: { id: string; is_admin?: boolean } }>(
      buildUrl(config, '/api/workspaces/current'),
      headers,
      config,
      'GET /api/workspaces/current'
    ),
    fetchWithRetry<RawShipPeopleResponse>(
      buildUrl(config, TEAM_PEOPLE_PATH),
      headers,
      config,
      'GET /api/team/people'
    ),
  ])

  if (workspaceResult.error) errors.push(workspaceResult.error)
  if (peopleResult.error) errors.push(peopleResult.error)

  const isAdmin = workspaceResult.data?.user?.is_admin ?? false

  const people = normalizePeople(peopleResult.data)

  const actorPerson = people.find((p) => matchesPersonId(p, actorId)) ?? null

  return {
    actorPerson,
    people,
    isAdmin,
    errors,
  }
}
