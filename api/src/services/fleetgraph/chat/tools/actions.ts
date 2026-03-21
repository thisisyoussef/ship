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

function buildPendingApproval(opts: {
  actionType: FleetGraphActionType
  targetId: string
  rationale: string
  evidence: string[]
  contextHints?: Record<string, unknown>
}): ChatToolResult {
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

  const dialogSpec = definition.buildDialogSpec(draft, {})

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
  description: 'Start a week. Transitions the week into active status. Requires approval.',
  parameters: startWeekParams,
  jsonSchema: zodToJsonSchema(startWeekParams),
  requiresApproval: true,
}

export async function executeStartWeek(
  params: { weekId: string }
): Promise<ChatToolResult> {
  return buildPendingApproval({
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
  description: 'Approve a week plan. Marks the plan as reviewed and accepted. Requires approval.',
  parameters: approveWeekPlanParams,
  jsonSchema: zodToJsonSchema(approveWeekPlanParams),
  requiresApproval: true,
}

export async function executeApproveWeekPlan(
  params: { weekId: string }
): Promise<ChatToolResult> {
  return buildPendingApproval({
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
  description: 'Approve a project plan. Marks the plan as reviewed and accepted. Requires approval.',
  parameters: approveProjectPlanParams,
  jsonSchema: zodToJsonSchema(approveProjectPlanParams),
  requiresApproval: true,
}

export async function executeApproveProjectPlan(
  params: { projectId: string }
): Promise<ChatToolResult> {
  return buildPendingApproval({
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
  description: 'Assign an owner to a document. Requires approval.',
  parameters: assignOwnerParams,
  jsonSchema: zodToJsonSchema(assignOwnerParams),
  requiresApproval: true,
}

export async function executeAssignOwner(
  params: { documentId: string; ownerId: string }
): Promise<ChatToolResult> {
  return buildPendingApproval({
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
  description: 'Assign one or more issues to a team member. Requires approval.',
  parameters: assignIssuesParams,
  jsonSchema: zodToJsonSchema(assignIssuesParams),
  requiresApproval: true,
}

export async function executeAssignIssues(
  params: { issueIds: string[]; assigneeId: string }
): Promise<ChatToolResult> {
  const targetId = params.issueIds[0] ?? 'unknown'
  return buildPendingApproval({
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
  description: 'Post a comment on a document. Requires approval.',
  parameters: postCommentParams,
  jsonSchema: zodToJsonSchema(postCommentParams),
  requiresApproval: true,
}

export async function executePostComment(
  params: { documentId: string; text: string }
): Promise<ChatToolResult> {
  return buildPendingApproval({
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
  description: 'Post a standup update for a week. Requires approval.',
  parameters: postStandupParams,
  jsonSchema: zodToJsonSchema(postStandupParams),
  requiresApproval: true,
}

export async function executePostStandup(
  params: { weekId: string; content: string }
): Promise<ChatToolResult> {
  return buildPendingApproval({
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
  description: 'Escalate a risk on a document. Flags the item for leadership attention. Requires approval.',
  parameters: escalateRiskParams,
  jsonSchema: zodToJsonSchema(escalateRiskParams),
  requiresApproval: true,
}

export async function executeEscalateRisk(
  params: { documentId: string; message: string }
): Promise<ChatToolResult> {
  return buildPendingApproval({
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
  description: 'Rebalance workload by moving issues to another team member. Requires approval.',
  parameters: rebalanceLoadParams,
  jsonSchema: zodToJsonSchema(rebalanceLoadParams),
  requiresApproval: true,
}

export async function executeRebalanceLoad(
  params: { issueIds: string[]; targetAssigneeId: string }
): Promise<ChatToolResult> {
  const targetId = params.issueIds[0] ?? 'unknown'
  return buildPendingApproval({
    actionType: 'rebalance_load',
    targetId,
    rationale: `Rebalance ${params.issueIds.length} issue(s) to ${params.targetAssigneeId}`,
    evidence: [`User requested load rebalance for issues: ${params.issueIds.join(', ')}`],
    contextHints: { issueIds: params.issueIds, targetAssigneeId: params.targetAssigneeId },
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
]

/** Dispatch an action tool execution by name. */
export async function executeActionTool(
  name: string,
  params: unknown
): Promise<ChatToolResult> {
  switch (name) {
    case 'start_week':
      return executeStartWeek(params as { weekId: string })
    case 'approve_week_plan':
      return executeApproveWeekPlan(params as { weekId: string })
    case 'approve_project_plan':
      return executeApproveProjectPlan(params as { projectId: string })
    case 'assign_owner':
      return executeAssignOwner(params as { documentId: string; ownerId: string })
    case 'assign_issues':
      return executeAssignIssues(params as { issueIds: string[]; assigneeId: string })
    case 'post_comment':
      return executePostComment(params as { documentId: string; text: string })
    case 'post_standup':
      return executePostStandup(params as { weekId: string; content: string })
    case 'escalate_risk':
      return executeEscalateRisk(params as { documentId: string; message: string })
    case 'rebalance_load':
      return executeRebalanceLoad(params as { issueIds: string[]; targetAssigneeId: string })
    default:
      return { success: false, error: `Unknown action tool: ${name}` }
  }
}
