/**
 * FleetGraph Chat Orchestrator
 *
 * Core tool-calling loop that drives the LLM conversation.
 * Manages session lifecycle, tool dispatch, and HITL approval flow.
 */

import type { ShipRestRequestContext } from '../actions/executor.js'
import type {
  FleetGraphActionDefinition,
  FleetGraphDialogSubmission,
} from '../actions/registry.js'
import { getActionDefinition } from '../actions/registry.js'
import type { ShipRestActionResult } from '../actions/executor.js'
import type { LLMToolCallingAdapter } from '../llm/types.js'

import { checkToolCallPolicy, checkTurnPolicy, type PolicyContext } from './policy.js'
import type { ChatSessionStore } from './session.js'
import {
  ALL_TOOL_SCHEMAS,
  executeTool,
  isActionTool,
  type ToolExecutionContext,
} from './tools/index.js'
import type {
  ChatMessage,
  ChatSession,
  ChatTurnResult,
  PendingToolApproval,
} from './types.js'
import { MAX_LLM_ROUNDS_PER_TURN, MAX_TOOL_CALLS_PER_TURN } from './types.js'

// ──────────────────────────────────────────────────────────────────────────────
// System prompt
// ──────────────────────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are FleetGraph, an intelligent project agent embedded in Ship — a project management tool.

You don't just answer questions. You analyze project state, identify problems, and take action to fix them. You are the user's co-pilot for managing sprints, issues, and team accountability.

## Ship's Data Model
- Everything in Ship is a **document** with a type: sprint (week), project, issue, program, wiki.
- **Sprints** have a lifecycle: planning → active → completed. They contain issues and standups.
- **Issues** have states: backlog → todo → in_progress → done (or cancelled). They have priority (low/medium/high), an assignee, and belong to sprints/projects.
- **Projects** group sprints and issues. They have an owner, accountable person, target date, and plan.
- **Plans** need approval from a manager or accountable person.

## Your Tools

### Reading tools (use freely to gather data):
- \`fetch_week\` / \`fetch_project\` / \`fetch_issue\` / \`fetch_program\` — get document details
- \`fetch_team_people\` — get team members with roles
- \`fetch_accountability\` — get overdue action items
- \`fetch_standups\` / \`fetch_comments\` / \`fetch_activity\` — get context

### Action tools (propose when you find problems or when the user asks):
- \`start_week\` — activate a sprint that's stuck in planning
- \`create_issue\` — add a new task/issue to a sprint or project
- \`update_issue\` — change issue state, priority, assignee, or title
- \`update_sprint_plan\` — set or update sprint goals, success criteria, confidence
- \`update_sprint\` — change sprint title, owner, or status
- \`update_project\` — update project plan, target date, or owner
- \`approve_week_plan\` / \`approve_project_plan\` — approve a submitted plan
- \`post_comment\` / \`post_standup\` — add comments or standup updates
- \`assign_owner\` / \`assign_issues\` / \`rebalance_load\` / \`escalate_risk\`

Every action tool requires user confirmation before executing. The user sees what will happen and can approve or cancel.

## When to Propose Actions
- Sprint in "planning" past its start date → call \`start_week\`
- Sprint has 0 issues → suggest creating issues with \`create_issue\`
- User says "add X to the sprint" → call \`create_issue\` immediately
- User says "mark X as done" → call \`update_issue\` with state "done"
- Sprint plan is empty → propose \`update_sprint_plan\`
- Plan awaiting approval → propose \`approve_week_plan\`
- User says "set goals to X" → call \`update_sprint_plan\` with the goals
- Issue is stale (no updates for days) → suggest reassigning or escalating
- Workload is imbalanced → suggest \`rebalance_load\`

## How to Respond
1. **Be brief.** Lead with a 1-2 sentence summary of what you found.
2. **Be specific.** Name the sprint, issue, or person — don't say "the sprint", say "Sprint 14".
3. **Always propose actions.** If you find a problem, offer to fix it. Never just describe a problem without a solution.
4. **When the user asks you to do something, do it.** If they say "add a task called X", call \`create_issue\` immediately. Don't explain what you could do — just do it.
5. **Use real data.** Only state facts from data you fetched. Don't guess.

## Rules
- NEVER ask for IDs. You have the current document context below.
- NEVER give generic project management advice. Only give advice grounded in the actual data.
- When everything looks fine, say so in one sentence. Don't pad with filler.
- If you need more data, fetch it with a tool — don't ask the user to look it up.`

function buildSystemPrompt(documentId: string, documentType: string, documentTitle?: string): string {
  const typeToTool: Record<string, string> = {
    sprint: 'fetch_week',
    week: 'fetch_week',
    project: 'fetch_project',
    issue: 'fetch_issue',
    program: 'fetch_program',
  }
  const tool = typeToTool[documentType] ?? 'fetch_week'
  const titleLine = documentTitle ? `\nTitle: "${documentTitle}"` : ''

  return `${BASE_SYSTEM_PROMPT}

## Current Page Context
Document ID: ${documentId}
Document Type: ${documentType}${titleLine}

To analyze this ${documentType}, start by calling the \`${tool}\` tool with the ID above. Do NOT ask the user for any IDs.`
}

// ──────────────────────────────────────────────────────────────────────────────
// Input types
// ──────────────────────────────────────────────────────────────────────────────

export interface ChatOrchestratorDeps {
  llm: LLMToolCallingAdapter
  sessionStore: ChatSessionStore
}

export interface StartChatInput {
  workspaceId: string
  actorId: string
  documentId: string
  documentType: string
  documentTitle?: string
  requestContext: ShipRestRequestContext
}

export interface SendMessageInput {
  threadId: string
  message: string
  actorId: string
  workspaceId: string
  requestContext: ShipRestRequestContext
}

export interface ApproveActionInput {
  threadId: string
  actorId: string
  workspaceId: string
  submission: FleetGraphDialogSubmission
  requestContext: ShipRestRequestContext
}

export interface DismissActionInput {
  threadId: string
  actorId: string
  workspaceId: string
  requestContext: ShipRestRequestContext
}

// ──────────────────────────────────────────────────────────────────────────────
// Ship REST executor with body support
// ──────────────────────────────────────────────────────────────────────────────

async function executeShipRest(
  path: string,
  requestContext: ShipRestRequestContext,
  method = 'POST',
  body?: Record<string, unknown>
): Promise<ShipRestActionResult> {
  const response = await fetch(`${requestContext.baseUrl}${path}`, {
    headers: {
      ...(requestContext.cookieHeader ? { cookie: requestContext.cookieHeader } : {}),
      ...(requestContext.csrfToken ? { 'x-csrf-token': requestContext.csrfToken } : {}),
      accept: 'application/json',
      'content-type': 'application/json',
    },
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const contentType = response.headers.get('content-type') ?? ''
  const responseBody = contentType.includes('application/json')
    ? await response.json() as Record<string, unknown>
    : undefined

  return { body: responseBody, ok: response.ok, status: response.status }
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal loop result
// ──────────────────────────────────────────────────────────────────────────────

interface LoopResult {
  text: string
  toolCallsExecuted: number
  llmRoundsUsed: number
  pendingApproval?: PendingToolApproval
}

// ──────────────────────────────────────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────────────────────────────────────

export function createChatOrchestrator(deps: ChatOrchestratorDeps) {
  const { llm, sessionStore } = deps

  // ────────────────────────────────────────────────────────────────────────
  // Tool-calling loop
  // ────────────────────────────────────────────────────────────────────────

  async function runToolCallingLoop(
    session: ChatSession,
    ctx: ToolExecutionContext
  ): Promise<LoopResult> {
    let roundsUsed = 0
    let toolCallsThisTurn = 0

    while (roundsUsed < MAX_LLM_ROUNDS_PER_TURN) {
      roundsUsed++

      // Call LLM with tools
      let response
      try {
        response = await llm.generateWithTools({
          messages: session.messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
            ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          })),
          tools: ALL_TOOL_SCHEMAS,
          instructions: session.messages.find((m) => m.role === 'system')?.content ?? BASE_SYSTEM_PROMPT,
          maxOutputTokens: 2000,
          temperature: 0.2,
        })
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'LLM request failed'
        return {
          text: `I encountered an error communicating with the AI model: ${errorMsg}`,
          toolCallsExecuted: toolCallsThisTurn,
          llmRoundsUsed: roundsUsed,
        }
      }

      // Track token usage
      if (response.usage) {
        session.tokenBudget.used += response.usage.totalTokens ?? 0
      }

      // Separate text output from tool calls
      const textItems = response.output.filter(
        (o): o is { type: 'text'; text: string } => o.type === 'text'
      )
      const toolCalls = response.output.filter(
        (
          o
        ): o is {
          type: 'function_call'
          id: string
          name: string
          arguments: string
        } => o.type === 'function_call'
      )

      // If only text -> final answer
      if (toolCalls.length === 0) {
        const text = textItems.map((t) => t.text).join('\n').trim()
        session.messages.push({ role: 'assistant', content: text })
        sessionStore.touch(session.threadId)
        return {
          text,
          toolCallsExecuted: toolCallsThisTurn,
          llmRoundsUsed: roundsUsed,
        }
      }

      // Append assistant message with tool_calls
      const assistantText = textItems.map((t) => t.text).join('\n').trim()
      session.messages.push({
        role: 'assistant',
        content: assistantText,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      })

      // Execute each tool call
      for (const toolCall of toolCalls) {
        toolCallsThisTurn++
        session.toolCallCount++

        // Per-turn and lifetime budget check
        const lifetimeCheck = checkToolCallPolicy({
          session,
          actorId: session.actorId,
          workspaceId: session.workspaceId,
        })
        if (!lifetimeCheck.allowed || toolCallsThisTurn > MAX_TOOL_CALLS_PER_TURN) {
          session.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: 'Tool call budget exceeded for this turn.',
            }),
          })
          continue
        }

        // Check if action tool (needs approval)
        if (isActionTool(toolCall.name)) {
          try {
            const params = JSON.parse(toolCall.arguments)
            const result = await executeTool(toolCall.name, params, ctx)

            if (
              result.data &&
              typeof result.data === 'object' &&
              'pendingApproval' in (result.data as Record<string, unknown>)
            ) {
              const pending = (
                result.data as { pendingApproval: PendingToolApproval }
              ).pendingApproval
              pending.toolCallId = toolCall.id
              session.pendingApproval = pending
              sessionStore.touch(session.threadId)

              // Pause for approval -- don't append tool result
              return {
                text: assistantText,
                toolCallsExecuted: toolCallsThisTurn,
                llmRoundsUsed: roundsUsed,
                pendingApproval: pending,
              }
            }

            // Action tool returned non-approval result (unexpected, but handle)
            session.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(
                result.success ? result.data : { error: result.error }
              ),
            })
          } catch (err) {
            session.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error:
                  err instanceof Error ? err.message : 'Action tool failed',
              }),
            })
          }
          continue
        }

        // Retrieval tool -- execute and append result
        try {
          const params = JSON.parse(toolCall.arguments)
          const result = await executeTool(toolCall.name, params, ctx)
          session.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(
              result.success ? result.data : { error: result.error }
            ),
          })
        } catch (err) {
          session.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error:
                err instanceof Error ? err.message : 'Tool execution failed',
            }),
          })
        }
      }

      sessionStore.touch(session.threadId)
      // Continue loop -- LLM will see tool results and decide next
    }

    // Hit max rounds without a text-only response, force a summary
    return {
      text: 'I reached my analysis limit for this turn. Here is what I found so far.',
      toolCallsExecuted: toolCallsThisTurn,
      llmRoundsUsed: roundsUsed,
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Build ChatTurnResult from loop output
  // ────────────────────────────────────────────────────────────────────────

  function buildTurnResult(
    loopResult: LoopResult,
    session: ChatSession
  ): ChatTurnResult {
    return {
      analysisNarrative: loopResult.text,
      actionDrafts: session.pendingApproval
        ? [session.pendingApproval.actionDraft]
        : [],
      pendingApproval: session.pendingApproval,
      reasonedFindings: [], // Chat mode doesn't produce findings like the graph
      toolCallsExecuted: loopResult.toolCallsExecuted,
      llmRoundsUsed: loopResult.llmRoundsUsed,
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Build tool execution context
  // ────────────────────────────────────────────────────────────────────────

  function buildToolContext(
    workspaceId: string,
    requestContext: ShipRestRequestContext
  ): ToolExecutionContext {
    return { workspaceId, requestContext }
  }

  // ────────────────────────────────────────────────────────────────────────
  // startChat
  // ────────────────────────────────────────────────────────────────────────

  async function startChat(input: StartChatInput): Promise<ChatTurnResult> {
    const threadId = `fleetgraph:chat:${input.workspaceId}:${input.documentId}`

    // Always create a fresh session on startChat. Delete any stale session
    // from a prior page visit or deploy to avoid showing old error messages.
    const existingSession = sessionStore.get(threadId)
    if (existingSession) {
      sessionStore.delete(threadId)
    }

    const session = sessionStore.create({
      threadId,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      documentId: input.documentId,
      documentType: input.documentType,
    })

    // Add system message with document context baked in
    session.messages.push({
      role: 'system',
      content: buildSystemPrompt(input.documentId, input.documentType, input.documentTitle),
    })

    // Add initial user message referencing the current page
    session.messages.push({
      role: 'user',
      content: `Analyze this ${input.documentType} and tell me what's important. The document ID is ${input.documentId}.`,
    })

    const ctx = buildToolContext(input.workspaceId, input.requestContext)
    const loopResult = await runToolCallingLoop(session, ctx)
    return buildTurnResult(loopResult, session)
  }

  // ────────────────────────────────────────────────────────────────────────
  // sendMessage
  // ────────────────────────────────────────────────────────────────────────

  async function sendMessage(input: SendMessageInput): Promise<ChatTurnResult> {
    const session = sessionStore.get(input.threadId)
    if (!session) {
      return {
        analysisNarrative: 'Session not found or expired. Please start a new chat.',
        actionDrafts: [],
        pendingApproval: null,
        reasonedFindings: [],
        toolCallsExecuted: 0,
        llmRoundsUsed: 0,
      }
    }

    // Policy check
    const policyCtx: PolicyContext = {
      session,
      actorId: input.actorId,
      workspaceId: input.workspaceId,
    }
    const policyResult = checkTurnPolicy(policyCtx)
    if (!policyResult.allowed) {
      return {
        analysisNarrative: policyResult.reason ?? 'Message not allowed.',
        actionDrafts: [],
        pendingApproval: session.pendingApproval,
        reasonedFindings: [],
        toolCallsExecuted: 0,
        llmRoundsUsed: 0,
      }
    }

    // Append user message
    session.messages.push({ role: 'user', content: input.message })

    const ctx = buildToolContext(input.workspaceId, input.requestContext)
    const loopResult = await runToolCallingLoop(session, ctx)
    return buildTurnResult(loopResult, session)
  }

  // ────────────────────────────────────────────────────────────────────────
  // approveAction
  // ────────────────────────────────────────────────────────────────────────

  async function approveAction(
    input: ApproveActionInput
  ): Promise<ChatTurnResult> {
    const session = sessionStore.get(input.threadId)
    if (!session) {
      return {
        analysisNarrative: 'Session not found or expired.',
        actionDrafts: [],
        pendingApproval: null,
        reasonedFindings: [],
        toolCallsExecuted: 0,
        llmRoundsUsed: 0,
      }
    }

    if (!session.pendingApproval) {
      return {
        analysisNarrative: 'No action is pending approval.',
        actionDrafts: [],
        pendingApproval: null,
        reasonedFindings: [],
        toolCallsExecuted: 0,
        llmRoundsUsed: 0,
      }
    }

    // Verify actor
    if (input.actorId !== session.actorId) {
      return {
        analysisNarrative: 'Actor does not match session owner.',
        actionDrafts: [],
        pendingApproval: session.pendingApproval,
        reasonedFindings: [],
        toolCallsExecuted: 0,
        llmRoundsUsed: 0,
      }
    }

    const pending = session.pendingApproval
    const actionDef = getActionDefinition(
      pending.actionType as Parameters<typeof getActionDefinition>[0]
    )

    let outcomeMessage: string

    if (actionDef) {
      // Build execution plan and execute
      try {
        const plan = actionDef.buildExecutionPlan(
          pending.actionDraft,
          input.submission
        )

        // Execute via Ship REST (with body support)
        const results = []
        for (const endpoint of plan.endpoints) {
          const result = await executeShipRest(
            endpoint.path,
            input.requestContext,
            endpoint.method,
            endpoint.body as Record<string, unknown> | undefined
          )
          results.push(result)
        }

        const allOk = results.every((r) => r.ok)
        outcomeMessage = allOk
          ? `Action "${pending.actionType}" completed successfully.`
          : `Action "${pending.actionType}" partially failed. Some requests returned errors.`

        // Record completed action
        session.completedActions.push({
          actionType: pending.actionType,
          targetId: pending.actionDraft.targetId,
          outcome: allOk ? 'success' : 'failure',
          message: outcomeMessage,
          completedAt: new Date().toISOString(),
        })
      } catch (err) {
        outcomeMessage = `Action "${pending.actionType}" failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        session.completedActions.push({
          actionType: pending.actionType,
          targetId: pending.actionDraft.targetId,
          outcome: 'failure',
          message: outcomeMessage,
          completedAt: new Date().toISOString(),
        })
      }
    } else {
      outcomeMessage = `Unknown action type "${pending.actionType}". Could not execute.`
    }

    // Append tool result message
    session.messages.push({
      role: 'tool',
      tool_call_id: pending.toolCallId,
      content: JSON.stringify({ success: true, message: outcomeMessage }),
    })

    // Clear pending approval
    session.pendingApproval = null

    // Run one more LLM round to generate completion message
    const ctx = buildToolContext(input.workspaceId, input.requestContext)
    const loopResult = await runToolCallingLoop(session, ctx)
    return buildTurnResult(loopResult, session)
  }

  // ────────────────────────────────────────────────────────────────────────
  // dismissAction
  // ────────────────────────────────────────────────────────────────────────

  async function dismissAction(
    input: DismissActionInput
  ): Promise<ChatTurnResult> {
    const session = sessionStore.get(input.threadId)
    if (!session) {
      return {
        analysisNarrative: 'Session not found or expired.',
        actionDrafts: [],
        pendingApproval: null,
        reasonedFindings: [],
        toolCallsExecuted: 0,
        llmRoundsUsed: 0,
      }
    }

    if (!session.pendingApproval) {
      return {
        analysisNarrative: 'No action is pending approval.',
        actionDrafts: [],
        pendingApproval: null,
        reasonedFindings: [],
        toolCallsExecuted: 0,
        llmRoundsUsed: 0,
      }
    }

    if (input.actorId !== session.actorId) {
      return {
        analysisNarrative: 'Actor does not match session owner.',
        actionDrafts: [],
        pendingApproval: session.pendingApproval,
        reasonedFindings: [],
        toolCallsExecuted: 0,
        llmRoundsUsed: 0,
      }
    }

    const pending = session.pendingApproval

    // Append tool result with dismissal
    session.messages.push({
      role: 'tool',
      tool_call_id: pending.toolCallId,
      content: JSON.stringify({
        success: false,
        error: 'User dismissed this action.',
      }),
    })

    // Clear pending approval
    session.pendingApproval = null

    // Run one more LLM round
    const ctx = buildToolContext(input.workspaceId, input.requestContext)
    const loopResult = await runToolCallingLoop(session, ctx)
    return buildTurnResult(loopResult, session)
  }

  // ────────────────────────────────────────────────────────────────────────
  // getSession
  // ────────────────────────────────────────────────────────────────────────

  function getSession(threadId: string): ChatSession | undefined {
    return sessionStore.get(threadId)
  }

  return {
    startChat,
    sendMessage,
    approveAction,
    dismissAction,
    getSession,
  }
}
