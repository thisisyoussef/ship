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
import { defaultShipRestExecutor } from '../actions/executor.js'
import type { LLMToolCallingAdapter } from '../llm/types.js'

import { checkTurnPolicy, type PolicyContext } from './policy.js'
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

const SYSTEM_PROMPT = `You are FleetGraph, a project intelligence assistant for Ship.

You help users understand their projects, sprints, issues, and team accountability.

## Available Data
You have access to tools that fetch real-time data from Ship:
- Issues, projects, sprints/weeks, programs
- Team members and their roles
- Standups, comments, activity history
- Accountability action items

## How to Help
1. When analyzing a document, fetch the relevant data first
2. Look for: deadline risks, stale work, missing standups, approval gaps, workload imbalance
3. Answer questions directly with grounded facts
4. When recommending an action, use the appropriate action tool

## Rules
- Only state facts you can verify from the data you fetched
- Do not invent people, dates, or statistics
- Keep answers concise and actionable
- When something looks fine, say so plainly
- If you need more data to answer well, fetch it`

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
          })),
          tools: ALL_TOOL_SCHEMAS,
          instructions: SYSTEM_PROMPT,
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

        // Budget check
        if (toolCallsThisTurn > MAX_TOOL_CALLS_PER_TURN) {
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

    // Reuse existing session if still valid
    let session = sessionStore.get(threadId)
    if (!session) {
      session = sessionStore.create({
        threadId,
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        documentId: input.documentId,
        documentType: input.documentType,
      })
    }

    // Add system message
    session.messages.push({
      role: 'system',
      content: SYSTEM_PROMPT,
    })

    // Add initial user message
    session.messages.push({
      role: 'user',
      content: `Analyze this ${input.documentType} and tell me what's important.`,
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

        // Execute via Ship REST
        const results = []
        for (const endpoint of plan.endpoints) {
          const result = await defaultShipRestExecutor(
            endpoint.path,
            input.requestContext,
            endpoint.method
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
    const ctx: ToolExecutionContext = {
      workspaceId: input.workspaceId,
      requestContext: {
        baseUrl: '',
        cookieHeader: undefined,
        csrfToken: undefined,
      },
    }
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
