/**
 * FleetGraph Chat Action Tools
 *
 * 9 write tools that are HITL-gated. Instead of executing directly,
 * they build PendingToolApproval objects for the orchestrator to present.
 */

import { z } from 'zod'

import {
  buildActionId,
  getActionDefinition,
  type FleetGraphActionType,
} from '../../actions/registry.js'
import type { ChatToolDefinition, ChatToolResult, PendingToolApproval } from '../types.js'

import { zodToJsonSchema } from './schemas.js'

// ──────────────────────────────────────────────────────────────────────────────
// Helper: build a pending approval from action params
// ──────────────────────────────────────────────────────────────────────────────

async function buildPendingApproval(opts: {
  actionType: FleetGraphActionType
  targetId: string
  workspaceId?: string
  rationale: string
  evidence: string[]
  contextHints?: Record<string, unknown>
}): Promise<ChatToolResult> {
  const definition = getActionDefinition(opts.actionType)
  if (!definition) {
    return { success: false, error: `Unknown action type: ${opts.actionType}` }
  }

  const actionId = buildActionId(opts.actionType, opts.targetId)

  const draft = {
    actionId,
    actionType: opts.actionType,
    targetId: opts.targetId,
    targetType: definition.targetType,
    evidence: opts.evidence,
    rationale: opts.rationale,
    contextHints: opts.contextHints,
  }

  // Hydrate options for select-based dialogs (assign_owner, assign_issues, etc.)
  let hydratedOptions: Record<string, import('../../actions/registry.js').FleetGraphSelectOption[]> = {}
  if (definition.hydrateOptions && opts.workspaceId) {
    try {
      hydratedOptions = await definition.hydrateOptions({
        targetId: opts.targetId,
        workspaceId: opts.workspaceId,
      })
    } catch {
      // Fall back to empty options if hydration fails
    }
  }

  const dialogSpec = definition.buildDialogSpec(draft, hydratedOptions)

  const pendingApproval: PendingToolApproval = {
    toolCallId: '', // Filled by the orchestrator with the OpenAI tool_call.id
    actionType: opts.actionType,
    actionDraft: draft,
    dialogSpec,
    rationale: opts.rationale,
    evidence: opts.evidence,
  }

  return { success: true, data: { pendingApproval } }
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. start_week
// ──────────────────────────────────────────────────────────────────────────────

const startWeekParams = z.object({
  weekId: z.string().describe('The ID of the week to start'),
})

export const startWeekTool: ChatToolDefinition = {
  name: 'start_week',
  category: 'action',
  description: 'Start a sprint/week, transitioning from planning to active. Use when a sprint is past its start date and still in planning, or when the user asks to start a sprint. The user will confirm.',
  parameters: startWeekParams,
  jsonSchema: zodToJsonSchema(startWeekParams),
  requiresApproval: true,
}

export async function executeStartWeek(
  params: { weekId: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  return buildPendingApproval({
    workspaceId,
    actionType: 'start_week',
    targetId: params.weekId,
    rationale: `Start week ${params.weekId}`,
    evidence: [`User requested to start week ${params.weekId}`],
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. approve_week_plan
// ──────────────────────────────────────────────────────────────────────────────

const approveWeekPlanParams = z.object({
  weekId: z.string().describe('The ID of the week plan to approve'),
})

export const approveWeekPlanTool: ChatToolDefinition = {
  name: 'approve_week_plan',
  category: 'action',
  description: 'Approve a sprint plan. Use when a plan has been submitted and is awaiting approval, or when the user asks to approve. The user will confirm.',
  parameters: approveWeekPlanParams,
  jsonSchema: zodToJsonSchema(approveWeekPlanParams),
  requiresApproval: true,
}

export async function executeApproveWeekPlan(
  params: { weekId: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  return buildPendingApproval({
    workspaceId,
    actionType: 'approve_week_plan',
    targetId: params.weekId,
    rationale: `Approve week plan for ${params.weekId}`,
    evidence: [`User requested to approve week plan ${params.weekId}`],
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. approve_project_plan
// ──────────────────────────────────────────────────────────────────────────────

const approveProjectPlanParams = z.object({
  projectId: z.string().describe('The ID of the project plan to approve'),
})

export const approveProjectPlanTool: ChatToolDefinition = {
  name: 'approve_project_plan',
  category: 'action',
  description: 'Approve a project plan. Use when a project plan is pending approval or the user asks to approve it. The user will confirm.',
  parameters: approveProjectPlanParams,
  jsonSchema: zodToJsonSchema(approveProjectPlanParams),
  requiresApproval: true,
}

export async function executeApproveProjectPlan(
  params: { projectId: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  return buildPendingApproval({
    workspaceId,
    actionType: 'approve_project_plan',
    targetId: params.projectId,
    rationale: `Approve project plan for ${params.projectId}`,
    evidence: [`User requested to approve project plan ${params.projectId}`],
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. assign_owner
// ──────────────────────────────────────────────────────────────────────────────

const assignOwnerParams = z.object({
  documentId: z.string().describe('The document to assign an owner to'),
  ownerId: z.string().describe('The person ID to assign as owner'),
})

export const assignOwnerTool: ChatToolDefinition = {
  name: 'assign_owner',
  category: 'action',
  description: 'Assign an owner to a sprint, project, or issue. Use when work has no owner or the user asks to assign someone. The user will confirm.',
  parameters: assignOwnerParams,
  jsonSchema: zodToJsonSchema(assignOwnerParams),
  requiresApproval: true,
}

export async function executeAssignOwner(
  params: { documentId: string; ownerId: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  return buildPendingApproval({
    workspaceId,
    actionType: 'assign_owner',
    targetId: params.documentId,
    rationale: `Assign owner ${params.ownerId} to document ${params.documentId}`,
    evidence: [`User requested to assign owner ${params.ownerId}`],
    contextHints: { ownerId: params.ownerId },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. assign_issues
// ──────────────────────────────────────────────────────────────────────────────

const assignIssuesParams = z.object({
  issueIds: z.array(z.string()).describe('The issue IDs to reassign'),
  assigneeId: z.string().describe('The person ID to assign issues to'),
})

export const assignIssuesTool: ChatToolDefinition = {
  name: 'assign_issues',
  category: 'action',
  description: 'Reassign one or more issues to a different team member. Use for workload rebalancing or when the user asks to move issues. The user will confirm.',
  parameters: assignIssuesParams,
  jsonSchema: zodToJsonSchema(assignIssuesParams),
  requiresApproval: true,
}

export async function executeAssignIssues(
  params: { issueIds: string[]; assigneeId: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  const targetId = params.issueIds[0] ?? 'unknown'
  return buildPendingApproval({
    workspaceId,
    actionType: 'assign_issues',
    targetId,
    rationale: `Assign ${params.issueIds.length} issue(s) to ${params.assigneeId}`,
    evidence: [`User requested to assign issues: ${params.issueIds.join(', ')}`],
    contextHints: { issueIds: params.issueIds, assigneeId: params.assigneeId },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. post_comment
// ──────────────────────────────────────────────────────────────────────────────

const postCommentParams = z.object({
  documentId: z.string().describe('The document to comment on'),
  text: z.string().describe('The comment text'),
})

export const postCommentTool: ChatToolDefinition = {
  name: 'post_comment',
  category: 'action',
  description: 'Post a comment on a sprint, project, or issue. Use when the user asks to leave a note, provide feedback, or document a decision. The user will confirm the comment text.',
  parameters: postCommentParams,
  jsonSchema: zodToJsonSchema(postCommentParams),
  requiresApproval: true,
}

export async function executePostComment(
  params: { documentId: string; text: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  return buildPendingApproval({
    workspaceId,
    actionType: 'post_comment',
    targetId: params.documentId,
    rationale: `Post comment on document ${params.documentId}`,
    evidence: [`User requested to post comment: "${params.text.slice(0, 100)}"`],
    contextHints: { text: params.text },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. post_standup
// ──────────────────────────────────────────────────────────────────────────────

const postStandupParams = z.object({
  weekId: z.string().describe('The week to post standup for'),
  content: z.string().describe('The standup content'),
})

export const postStandupTool: ChatToolDefinition = {
  name: 'post_standup',
  category: 'action',
  description: 'Post a daily standup update for a sprint. Use when the user asks to submit their standup or when you help them draft one. The user will confirm.',
  parameters: postStandupParams,
  jsonSchema: zodToJsonSchema(postStandupParams),
  requiresApproval: true,
}

export async function executePostStandup(
  params: { weekId: string; content: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  return buildPendingApproval({
    workspaceId,
    actionType: 'post_standup',
    targetId: params.weekId,
    rationale: `Post standup for week ${params.weekId}`,
    evidence: [`User requested to post standup: "${params.content.slice(0, 100)}"`],
    contextHints: { content: params.content },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 8. escalate_risk
// ──────────────────────────────────────────────────────────────────────────────

const escalateRiskParams = z.object({
  documentId: z.string().describe('The document to escalate a risk for'),
  message: z.string().describe('The risk escalation message'),
})

export const escalateRiskTool: ChatToolDefinition = {
  name: 'escalate_risk',
  category: 'action',
  description: 'Escalate a risk by posting a risk comment on a document. Use when you detect deadline risk, stale blockers, or the user asks to flag something for leadership. The user will confirm.',
  parameters: escalateRiskParams,
  jsonSchema: zodToJsonSchema(escalateRiskParams),
  requiresApproval: true,
}

export async function executeEscalateRisk(
  params: { documentId: string; message: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  return buildPendingApproval({
    workspaceId,
    actionType: 'escalate_risk',
    targetId: params.documentId,
    rationale: `Escalate risk on document ${params.documentId}`,
    evidence: [`User requested risk escalation: "${params.message.slice(0, 100)}"`],
    contextHints: { message: params.message },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 9. rebalance_load
// ──────────────────────────────────────────────────────────────────────────────

const rebalanceLoadParams = z.object({
  issueIds: z.array(z.string()).describe('The issue IDs to move'),
  targetAssigneeId: z.string().describe('The person ID to receive the issues'),
})

export const rebalanceLoadTool: ChatToolDefinition = {
  name: 'rebalance_load',
  category: 'action',
  description: 'Move issues from an overloaded team member to someone with capacity. Use when workload is imbalanced or the user asks to redistribute work. The user will confirm.',
  parameters: rebalanceLoadParams,
  jsonSchema: zodToJsonSchema(rebalanceLoadParams),
  requiresApproval: true,
}

export async function executeRebalanceLoad(
  params: { issueIds: string[]; targetAssigneeId: string },
  workspaceId?: string
): Promise<ChatToolResult> {
  const targetId = params.issueIds[0] ?? 'unknown'
  return buildPendingApproval({
    workspaceId,
    actionType: 'rebalance_load',
    targetId,
    rationale: `Rebalance ${params.issueIds.length} issue(s) to ${params.targetAssigneeId}`,
    evidence: [`User requested load rebalance for issues: ${params.issueIds.join(', ')}`],
    contextHints: { issueIds: params.issueIds, targetAssigneeId: params.targetAssigneeId },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: build a pending approval for tools without a registry definition
// ──────────────────────────────────────────────────────────────────────────────

function buildDirectActionApproval(opts: {
  actionType: string
  targetId: string
  rationale: string
  evidence: string[]
  endpoint: { method: 'POST' | 'PATCH'; path: string; body?: Record<string, unknown> }
  dialogTitle: string
  dialogSummary: string
}): ChatToolResult {
  const pendingApproval: PendingToolApproval = {
    toolCallId: '',
    actionType: opts.actionType,
    actionDraft: {
      actionId: `${opts.actionType}:${opts.targetId}`,
      actionType: opts.actionType as FleetGraphActionType,
      targetId: opts.targetId,
      targetType: 'document' as const,
      evidence: opts.evidence,
      rationale: opts.rationale,
      contextHints: { endpoint: opts.endpoint },
    },
    dialogSpec: {
      kind: 'confirm',
      title: opts.dialogTitle,
      summary: opts.dialogSummary,
      confirmLabel: 'Apply',
      cancelLabel: 'Cancel',
      fields: [],
      evidence: opts.evidence,
    },
    rationale: opts.rationale,
    evidence: opts.evidence,
  }
  return { success: true, data: { pendingApproval } }
}

// ──────────────────────────────────────────────────────────────────────────────
// 10. create_issue
// ──────────────────────────────────────────────────────────────────────────────

const createIssueParams = z.object({
  title: z.string().describe('The title of the new issue'),
  weekId: z.string().optional().describe('The sprint/week ID to assign the issue to'),
  projectId: z.string().optional().describe('The project ID to assign the issue to'),
  state: z.enum(['backlog', 'todo', 'in_progress', 'done']).optional().describe('Initial state'),
  priority: z.enum(['low', 'medium', 'high']).optional().describe('Issue priority'),
  assigneeId: z.string().optional().describe('The person ID to assign the issue to'),
})

export const createIssueTool: ChatToolDefinition = {
  name: 'create_issue',
  category: 'action',
  description: 'Create a new issue/task in Ship. Use when the user asks to add a task, or when you identify work that needs to be done. Can assign to a sprint (weekId) or project. The user will confirm the issue details before creation.',
  parameters: createIssueParams,
  jsonSchema: zodToJsonSchema(createIssueParams),
  requiresApproval: true,
}

export async function executeCreateIssue(
  params: { title: string; weekId?: string; projectId?: string; state?: string; priority?: string; assigneeId?: string },
  _workspaceId?: string
): Promise<ChatToolResult> {
  const body: Record<string, unknown> = { title: params.title }
  if (params.state) body.state = params.state
  if (params.priority) body.priority = params.priority
  if (params.assigneeId) body.assignee_id = params.assigneeId
  if (params.weekId) body.week_id = params.weekId
  if (params.projectId) body.project_id = params.projectId

  return buildDirectActionApproval({
    actionType: 'create_issue',
    targetId: params.projectId ?? params.weekId ?? 'new',
    rationale: `Create issue: ${params.title}`,
    evidence: [`User requested to create issue "${params.title}"`],
    endpoint: { method: 'POST', path: '/api/issues', body },
    dialogTitle: 'Create Issue',
    dialogSummary: `Create issue "${params.title}"${params.state ? ` (${params.state})` : ''}${params.priority ? ` [${params.priority}]` : ''}`,
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 11. update_issue
// ──────────────────────────────────────────────────────────────────────────────

const updateIssueParams = z.object({
  issueId: z.string().describe('The ID of the issue to update'),
  state: z.enum(['backlog', 'todo', 'in_progress', 'done', 'cancelled']).optional().describe('New state'),
  priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority'),
  assigneeId: z.string().optional().describe('New assignee person ID'),
  title: z.string().optional().describe('New title'),
})

export const updateIssueTool: ChatToolDefinition = {
  name: 'update_issue',
  category: 'action',
  description: 'Update an existing issue — change its state, priority, assignee, or title. Use when the user says "mark as done", "assign to X", "change priority to high", etc. The user will confirm the change.',
  parameters: updateIssueParams,
  jsonSchema: zodToJsonSchema(updateIssueParams),
  requiresApproval: true,
}

export async function executeUpdateIssue(
  params: { issueId: string; state?: string; priority?: string; assigneeId?: string; title?: string },
  _workspaceId?: string
): Promise<ChatToolResult> {
  const body: Record<string, unknown> = {}
  if (params.state) body.state = params.state
  if (params.priority) body.priority = params.priority
  if (params.assigneeId) body.assignee_id = params.assigneeId
  if (params.title) body.title = params.title

  const changes = Object.keys(body).join(', ')
  return buildDirectActionApproval({
    actionType: 'update_issue',
    targetId: params.issueId,
    rationale: `Update issue ${params.issueId}: ${changes}`,
    evidence: [`User requested to update issue ${params.issueId} (${changes})`],
    endpoint: { method: 'PATCH', path: `/api/issues/${params.issueId}`, body },
    dialogTitle: 'Update Issue',
    dialogSummary: `Update issue ${params.issueId}: ${changes}`,
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 12. update_sprint_plan
// ──────────────────────────────────────────────────────────────────────────────

const updateSprintPlanParams = z.object({
  weekId: z.string().describe('The week/sprint ID to update the plan for'),
  plan: z.string().optional().describe('The plan text'),
  successCriteria: z.array(z.string()).optional().describe('Success criteria list'),
  confidence: z.number().optional().describe('Confidence level (0-100)'),
})

export const updateSprintPlanTool: ChatToolDefinition = {
  name: 'update_sprint_plan',
  category: 'action',
  description: 'Update a sprint plan — set goals, success criteria, or confidence level. Use when the user says "add goals", "set the plan to X", or when you notice a sprint has no plan. The user will confirm the update.',
  parameters: updateSprintPlanParams,
  jsonSchema: zodToJsonSchema(updateSprintPlanParams),
  requiresApproval: true,
}

export async function executeUpdateSprintPlan(
  params: { weekId: string; plan?: string; successCriteria?: string[]; confidence?: number },
  _workspaceId?: string
): Promise<ChatToolResult> {
  const body: Record<string, unknown> = {}
  if (params.plan !== undefined) body.plan = params.plan
  if (params.successCriteria !== undefined) body.success_criteria = params.successCriteria
  if (params.confidence !== undefined) body.confidence = params.confidence

  const changes = Object.keys(body).join(', ')
  return buildDirectActionApproval({
    actionType: 'update_sprint_plan',
    targetId: params.weekId,
    rationale: `Update sprint plan for ${params.weekId}: ${changes}`,
    evidence: [`User requested to update sprint plan for ${params.weekId} (${changes})`],
    endpoint: { method: 'PATCH', path: `/api/weeks/${params.weekId}/plan`, body },
    dialogTitle: 'Update Sprint Plan',
    dialogSummary: `Update sprint plan for week ${params.weekId}: ${changes}`,
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 13. update_sprint
// ──────────────────────────────────────────────────────────────────────────────

const updateSprintParams = z.object({
  weekId: z.string().describe('The week/sprint ID to update'),
  title: z.string().optional().describe('New sprint title'),
  ownerId: z.string().optional().describe('New owner person ID'),
})

export const updateSprintTool: ChatToolDefinition = {
  name: 'update_sprint',
  category: 'action',
  description: 'Update sprint properties — change its title or owner. Use when the user asks to rename a sprint or reassign ownership. The user will confirm.',
  parameters: updateSprintParams,
  jsonSchema: zodToJsonSchema(updateSprintParams),
  requiresApproval: true,
}

export async function executeUpdateSprint(
  params: { weekId: string; title?: string; ownerId?: string },
  _workspaceId?: string
): Promise<ChatToolResult> {
  const body: Record<string, unknown> = {}
  if (params.title) body.title = params.title
  if (params.ownerId) body.owner_id = params.ownerId

  const changes = Object.keys(body).join(', ')
  return buildDirectActionApproval({
    actionType: 'update_sprint',
    targetId: params.weekId,
    rationale: `Update sprint ${params.weekId}: ${changes}`,
    evidence: [`User requested to update sprint ${params.weekId} (${changes})`],
    endpoint: { method: 'PATCH', path: `/api/weeks/${params.weekId}`, body },
    dialogTitle: 'Update Sprint',
    dialogSummary: `Update sprint ${params.weekId}: ${changes}`,
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 14. update_project
// ──────────────────────────────────────────────────────────────────────────────

const updateProjectParams = z.object({
  projectId: z.string().describe('The project ID to update'),
  plan: z.string().optional().describe('New project plan'),
  targetDate: z.string().optional().describe('New target date (ISO 8601)'),
  ownerId: z.string().optional().describe('New owner person ID'),
})

export const updateProjectTool: ChatToolDefinition = {
  name: 'update_project',
  category: 'action',
  description: 'Update project properties — change plan, target date, or owner. Use when the user asks to update the project plan, change the deadline, or reassign ownership. The user will confirm.',
  parameters: updateProjectParams,
  jsonSchema: zodToJsonSchema(updateProjectParams),
  requiresApproval: true,
}

export async function executeUpdateProject(
  params: { projectId: string; plan?: string; targetDate?: string; ownerId?: string },
  _workspaceId?: string
): Promise<ChatToolResult> {
  const body: Record<string, unknown> = {}
  if (params.plan) body.plan = params.plan
  if (params.targetDate) body.target_date = params.targetDate
  if (params.ownerId) body.owner_id = params.ownerId

  const changes = Object.keys(body).join(', ')
  return buildDirectActionApproval({
    actionType: 'update_project',
    targetId: params.projectId,
    rationale: `Update project ${params.projectId}: ${changes}`,
    evidence: [`User requested to update project ${params.projectId} (${changes})`],
    endpoint: { method: 'PATCH', path: `/api/projects/${params.projectId}`, body },
    dialogTitle: 'Update Project',
    dialogSummary: `Update project ${params.projectId}: ${changes}`,
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// All action tools
// ──────────────────────────────────────────────────────────────────────────────

export const ACTION_TOOLS: ChatToolDefinition[] = [
  startWeekTool,
  approveWeekPlanTool,
  approveProjectPlanTool,
  assignOwnerTool,
  assignIssuesTool,
  postCommentTool,
  postStandupTool,
  escalateRiskTool,
  rebalanceLoadTool,
  createIssueTool,
  updateIssueTool,
  updateSprintPlanTool,
  updateSprintTool,
  updateProjectTool,
]

/** Dispatch an action tool execution by name. */
export async function executeActionTool(
  name: string,
  params: unknown,
  workspaceId?: string
): Promise<ChatToolResult> {
  const p = params as Record<string, unknown>
  const ws = workspaceId
  switch (name) {
    case 'start_week':
      return executeStartWeek(p as { weekId: string }, ws)
    case 'approve_week_plan':
      return executeApproveWeekPlan(p as { weekId: string }, ws)
    case 'approve_project_plan':
      return executeApproveProjectPlan(p as { projectId: string }, ws)
    case 'assign_owner':
      return executeAssignOwner(p as { documentId: string; ownerId: string }, ws)
    case 'assign_issues':
      return executeAssignIssues(p as { issueIds: string[]; assigneeId: string }, ws)
    case 'post_comment':
      return executePostComment(p as { documentId: string; text: string }, ws)
    case 'post_standup':
      return executePostStandup(p as { weekId: string; content: string }, ws)
    case 'escalate_risk':
      return executeEscalateRisk(p as { documentId: string; message: string }, ws)
    case 'rebalance_load':
      return executeRebalanceLoad(p as { issueIds: string[]; targetAssigneeId: string }, ws)
    case 'create_issue':
      return executeCreateIssue(p as { title: string; weekId?: string; projectId?: string; state?: string; priority?: string; assigneeId?: string }, ws)
    case 'update_issue':
      return executeUpdateIssue(p as { issueId: string; state?: string; priority?: string; assigneeId?: string; title?: string }, ws)
    case 'update_sprint_plan':
      return executeUpdateSprintPlan(p as { weekId: string; plan?: string; successCriteria?: string[]; confidence?: number }, ws)
    case 'update_sprint':
      return executeUpdateSprint(p as { weekId: string; title?: string; ownerId?: string }, ws)
    case 'update_project':
      return executeUpdateProject(p as { projectId: string; plan?: string; targetDate?: string; ownerId?: string }, ws)
    default:
      return { success: false, error: `Unknown action tool: ${name}` }
  }
}
