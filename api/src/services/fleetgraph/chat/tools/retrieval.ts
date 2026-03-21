/**
 * FleetGraph Chat Retrieval Tools
 *
 * 9 read-only tools that fetch Ship data for the LLM to reason over.
 * Each tool has a static ChatToolDefinition and an async execute function.
 */

import { z } from 'zod'

import type { ShipRestRequestContext } from '../../actions/executor.js'
import type { ChatToolDefinition, ChatToolResult } from '../types.js'

import { buildToolSchema, zodToJsonSchema } from './schemas.js'

// ──────────────────────────────────────────────────────────────────────────────
// Execution Context
// ──────────────────────────────────────────────────────────────────────────────

export interface ToolExecutionContext {
  workspaceId: string
  requestContext: ShipRestRequestContext
  fetchFn?: typeof fetch
}

// ──────────────────────────────────────────────────────────────────────────────
// Generic Ship API helper
// ──────────────────────────────────────────────────────────────────────────────

async function fetchShipApi(
  path: string,
  ctx: ToolExecutionContext
): Promise<unknown> {
  const baseUrl = ctx.requestContext.baseUrl
  const headers: Record<string, string> = { accept: 'application/json' }
  if (ctx.requestContext.cookieHeader) headers.cookie = ctx.requestContext.cookieHeader
  if (ctx.requestContext.csrfToken) headers['x-csrf-token'] = ctx.requestContext.csrfToken

  const fetchFn = ctx.fetchFn ?? fetch
  const response = await fetchFn(`${baseUrl}${path}`, { headers, method: 'GET' })
  if (!response.ok) throw new Error(`Ship API ${path} failed with ${response.status}`)
  return response.json()
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. fetch_issue
// ──────────────────────────────────────────────────────────────────────────────

const fetchIssueParams = z.object({
  issueId: z.string().describe('The ID of the issue to fetch'),
})

export const fetchIssueTool: ChatToolDefinition = {
  name: 'fetch_issue',
  category: 'retrieval',
  description: 'Fetch an issue by ID. Returns state, priority, assignee, estimate, and due date.',
  parameters: fetchIssueParams,
  jsonSchema: zodToJsonSchema(fetchIssueParams),
  requiresApproval: false,
}

export async function executeFetchIssue(
  params: { issueId: string },
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi(`/api/issues/${encodeURIComponent(params.issueId)}`, ctx)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. fetch_week
// ──────────────────────────────────────────────────────────────────────────────

const fetchWeekParams = z.object({
  weekId: z.string().describe('The ID of the week to fetch'),
})

export const fetchWeekTool: ChatToolDefinition = {
  name: 'fetch_week',
  category: 'retrieval',
  description: 'Fetch a week by ID. Returns status, sprint number, owner, plan, and issue count.',
  parameters: fetchWeekParams,
  jsonSchema: zodToJsonSchema(fetchWeekParams),
  requiresApproval: false,
}

export async function executeFetchWeek(
  params: { weekId: string },
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi(`/api/weeks/${encodeURIComponent(params.weekId)}`, ctx)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. fetch_project
// ──────────────────────────────────────────────────────────────────────────────

const fetchProjectParams = z.object({
  projectId: z.string().describe('The ID of the project to fetch'),
})

export const fetchProjectTool: ChatToolDefinition = {
  name: 'fetch_project',
  category: 'retrieval',
  description: 'Fetch a project by ID. Returns target date, owner, accountable person, and status.',
  parameters: fetchProjectParams,
  jsonSchema: zodToJsonSchema(fetchProjectParams),
  requiresApproval: false,
}

export async function executeFetchProject(
  params: { projectId: string },
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi(`/api/projects/${encodeURIComponent(params.projectId)}`, ctx)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. fetch_program
// ──────────────────────────────────────────────────────────────────────────────

const fetchProgramParams = z.object({
  programId: z.string().describe('The ID of the program to fetch'),
})

export const fetchProgramTool: ChatToolDefinition = {
  name: 'fetch_program',
  category: 'retrieval',
  description: 'Fetch a program by ID. Returns program overview with projects and status.',
  parameters: fetchProgramParams,
  jsonSchema: zodToJsonSchema(fetchProgramParams),
  requiresApproval: false,
}

export async function executeFetchProgram(
  params: { programId: string },
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi(`/api/programs/${encodeURIComponent(params.programId)}`, ctx)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. fetch_team_people
// ──────────────────────────────────────────────────────────────────────────────

const fetchTeamPeopleParams = z.object({})

export const fetchTeamPeopleTool: ChatToolDefinition = {
  name: 'fetch_team_people',
  category: 'retrieval',
  description: 'Fetch all team members in the workspace. Returns people with roles and reports_to.',
  parameters: fetchTeamPeopleParams,
  jsonSchema: zodToJsonSchema(fetchTeamPeopleParams),
  requiresApproval: false,
}

export async function executeFetchTeamPeople(
  _params: Record<string, never>,
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi('/api/team/people', ctx)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. fetch_accountability
// ──────────────────────────────────────────────────────────────────────────────

const fetchAccountabilityParams = z.object({})

export const fetchAccountabilityTool: ChatToolDefinition = {
  name: 'fetch_accountability',
  category: 'retrieval',
  description: 'Fetch accountability action items for the workspace.',
  parameters: fetchAccountabilityParams,
  jsonSchema: zodToJsonSchema(fetchAccountabilityParams),
  requiresApproval: false,
}

export async function executeFetchAccountability(
  _params: Record<string, never>,
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi('/api/accountability/action-items', ctx)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. fetch_standups
// ──────────────────────────────────────────────────────────────────────────────

const fetchStandupsParams = z.object({
  weekId: z.string().describe('The week ID to fetch standups for'),
})

export const fetchStandupsTool: ChatToolDefinition = {
  name: 'fetch_standups',
  category: 'retrieval',
  description: 'Fetch standups for a given week.',
  parameters: fetchStandupsParams,
  jsonSchema: zodToJsonSchema(fetchStandupsParams),
  requiresApproval: false,
}

export async function executeFetchStandups(
  params: { weekId: string },
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi(`/api/weeks/${encodeURIComponent(params.weekId)}/standups`, ctx)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 8. fetch_comments
// ──────────────────────────────────────────────────────────────────────────────

const fetchCommentsParams = z.object({
  documentId: z.string().describe('The document ID to fetch comments for'),
})

export const fetchCommentsTool: ChatToolDefinition = {
  name: 'fetch_comments',
  category: 'retrieval',
  description: 'Fetch comment threads for a document.',
  parameters: fetchCommentsParams,
  jsonSchema: zodToJsonSchema(fetchCommentsParams),
  requiresApproval: false,
}

export async function executeFetchComments(
  params: { documentId: string },
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi(`/api/documents/${encodeURIComponent(params.documentId)}/comments`, ctx)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 9. fetch_activity
// ──────────────────────────────────────────────────────────────────────────────

const fetchActivityParams = z.object({
  entityType: z.enum(['program', 'project', 'sprint']).describe('The entity type'),
  entityId: z.string().describe('The entity ID'),
})

export const fetchActivityTool: ChatToolDefinition = {
  name: 'fetch_activity',
  category: 'retrieval',
  description: 'Fetch recent activity for a program, project, or sprint.',
  parameters: fetchActivityParams,
  jsonSchema: zodToJsonSchema(fetchActivityParams),
  requiresApproval: false,
}

export async function executeFetchActivity(
  params: { entityType: string; entityId: string },
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  try {
    const data = await fetchShipApi(
      `/api/activity/${encodeURIComponent(params.entityType)}/${encodeURIComponent(params.entityId)}`,
      ctx
    )
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// All retrieval tools
// ──────────────────────────────────────────────────────────────────────────────

export const RETRIEVAL_TOOLS: ChatToolDefinition[] = [
  fetchIssueTool,
  fetchWeekTool,
  fetchProjectTool,
  fetchProgramTool,
  fetchTeamPeopleTool,
  fetchAccountabilityTool,
  fetchStandupsTool,
  fetchCommentsTool,
  fetchActivityTool,
]

/** Dispatch a retrieval tool execution by name. */
export async function executeRetrievalTool(
  name: string,
  params: unknown,
  ctx: ToolExecutionContext
): Promise<ChatToolResult> {
  switch (name) {
    case 'fetch_issue':
      return executeFetchIssue(params as { issueId: string }, ctx)
    case 'fetch_week':
      return executeFetchWeek(params as { weekId: string }, ctx)
    case 'fetch_project':
      return executeFetchProject(params as { projectId: string }, ctx)
    case 'fetch_program':
      return executeFetchProgram(params as { programId: string }, ctx)
    case 'fetch_team_people':
      return executeFetchTeamPeople(params as Record<string, never>, ctx)
    case 'fetch_accountability':
      return executeFetchAccountability(params as Record<string, never>, ctx)
    case 'fetch_standups':
      return executeFetchStandups(params as { weekId: string }, ctx)
    case 'fetch_comments':
      return executeFetchComments(params as { documentId: string }, ctx)
    case 'fetch_activity':
      return executeFetchActivity(params as { entityType: string; entityId: string }, ctx)
    default:
      return { success: false, error: `Unknown retrieval tool: ${name}` }
  }
}
