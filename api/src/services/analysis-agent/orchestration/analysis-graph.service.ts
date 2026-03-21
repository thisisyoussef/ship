import type { LLMAdapter } from '../../fleetgraph/llm/types.js'
import type { AnalysisContext, ToolCallRecord, ToolContext } from '../types.js'
import { ALL_ANALYSIS_TOOLS, executeAnalysisTool, getToolSchemas } from './tool-registry.js'

// ── Types ────────────────────────────────────────────────────────

export interface AnalysisGraphResult {
  response: string
  toolCalls: ToolCallRecord[]
  suggestedFollowups: string[]
  actionSuggestions: Array<{
    action: string
    target_id: string
    target_type: string
    label: string
    rationale: string
  }>
}

export interface AnalysisGraphDeps {
  llm: LLMAdapter
}

// ── Constants ────────────────────────────────────────────────────

const MAX_ROUNDS = 5

const SYSTEM_PROMPT = `You are a Ship analysis assistant. You help teams understand their project data and take action.

## Your Context
You are embedded in Ship, a project management tool. The user is currently viewing a specific page.
You already know what they're looking at — the entity ID, type, and title are provided below.
DO NOT ask the user for IDs, project names, or entity references — you already have them.

## How to Work
1. Start by calling analysis_context_get to understand what the user is viewing.
2. Call entity_snapshot_get to get the current state of the entity.
3. For trends and history, use metric_timeseries_get.
4. For related work (issues, sprints, standups), use graph_neighbors_get.
5. For comparisons, use compare_entities_get.
6. For "why" questions, use anomaly_explain_get.
7. For evidence and proof, use evidence_lookup_get.

## Tool Calling
When you need data, use this exact format:
<tool_call>{"name": "tool_name", "args": {...}}</tool_call>

You may call multiple tools in one response. Wait for all tool results before providing your final answer.

## Response Rules
- Every numerical claim MUST come from a tool result. Never guess or make up numbers.
- Be specific: say "Sprint 14 has 3 open issues" not "the sprint has some issues."
- Use names and dates, not IDs.
- Keep answers concise — 2-4 paragraphs for initial analysis, 1-2 for followups.
- Do NOT mention internal fields like "confidence level", "confidence_score", "performance_rating", or "monetary_impact" — these are internal metrics irrelevant to the user.
- Do NOT regurgitate raw JSON or internal field names. Translate everything to plain English.
- When discussing sprints: mention status, owner, issue count, plan status, and what needs to happen next.
- When discussing projects: mention status, owner, target date, open issues, and recent activity.

## Suggesting Actions
When your analysis reveals actionable opportunities, suggest them using this format:
<action_suggestion>{"action": "action_type", "target_id": "entity_id", "target_type": "entity_type", "label": "Button label", "rationale": "Why this action makes sense"}</action_suggestion>

Available action types: start_week, approve_week_plan, approve_project_plan, post_standup, post_comment, assign_owner
Only suggest 1-2 actions when there is a clear, specific reason. The user sees these as interactive buttons.

## Follow-up Suggestions
After answering, suggest 2-3 follow-up questions in this format:
<followups>["question 1", "question 2", "question 3"]</followups>`

const TOOL_CALL_REGEX = /<tool_call>(.*?)<\/?tool_call>/gs
const FOLLOWUPS_REGEX = /<followups>(.*?)<\/followups>/s
const ACTION_SUGGESTION_REGEX = /<action_suggestion>(.*?)<\/?action_suggestion>/gs

// ── Implementation ───────────────────────────────────────────────

export function createAnalysisGraphService(deps: AnalysisGraphDeps) {
  const { llm } = deps

  function buildToolDescriptions(): string {
    const schemas = getToolSchemas()
    const lines = schemas.map((s) => {
      const params = JSON.stringify(s.parameters, null, 2)
      return `### ${s.name}\n${s.description}\nParameters: ${params}`
    })
    return `## Available Tools\n\n${lines.join('\n\n')}`
  }

  function buildInput(opts: {
    message: string
    context: AnalysisContext
    recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>
    summary: string | null
    toolDescriptions: string
    toolResults?: string
  }): string {
    const parts: string[] = []

    // Context
    parts.push(`## Current Page Context\nEntity type: ${opts.context.entity_type}\nEntity ID: ${opts.context.entity_id}`)
    if (opts.context.entity_title) {
      parts.push(`Entity title: ${opts.context.entity_title}`)
    }

    // Tool descriptions
    parts.push(opts.toolDescriptions)

    // Summary of earlier conversation
    if (opts.summary) {
      parts.push(`## Conversation Summary\n${opts.summary}`)
    }

    // Recent turns
    if (opts.recentTurns.length > 0) {
      const turnLines = opts.recentTurns.map(
        (t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`,
      )
      parts.push(`## Recent Conversation\n${turnLines.join('\n')}`)
    }

    // Tool results from previous rounds in this request
    if (opts.toolResults) {
      parts.push(`## Tool Results\n${opts.toolResults}`)
    }

    // Current message
    parts.push(`## Current User Message\n${opts.message}`)

    return parts.join('\n\n')
  }

  function parseToolCalls(text: string): Array<{ name: string; args: Record<string, unknown> }> {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    let match: RegExpExecArray | null

    // Reset regex lastIndex
    TOOL_CALL_REGEX.lastIndex = 0
    while ((match = TOOL_CALL_REGEX.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]!) as { name: string; args: Record<string, unknown> }
        if (parsed.name && typeof parsed.name === 'string') {
          calls.push({
            name: parsed.name,
            args: parsed.args ?? {},
          })
        }
      } catch {
        // Skip malformed tool calls
      }
    }
    return calls
  }

  function parseFollowups(text: string): string[] {
    FOLLOWUPS_REGEX.lastIndex = 0
    const match = FOLLOWUPS_REGEX.exec(text)
    if (!match) return []
    try {
      const arr = JSON.parse(match[1]!)
      if (Array.isArray(arr)) return arr.filter((s): s is string => typeof s === 'string')
    } catch {
      // Skip malformed followups
    }
    return []
  }

  function parseActionSuggestions(text: string): Array<{
    action: string
    target_id: string
    target_type: string
    label: string
    rationale: string
  }> {
    const suggestions: Array<{
      action: string
      target_id: string
      target_type: string
      label: string
      rationale: string
    }> = []
    ACTION_SUGGESTION_REGEX.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = ACTION_SUGGESTION_REGEX.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]!) as {
          action: string
          target_id: string
          target_type: string
          label: string
          rationale: string
        }
        if (parsed.action && parsed.label) {
          suggestions.push(parsed)
        }
      } catch {
        // Skip malformed
      }
    }
    return suggestions
  }

  function cleanResponse(text: string): string {
    // Remove tool calls with either proper or malformed closing tags
    let cleaned = text.replace(/<tool_call>.*?<\/?tool_call>/gs, '')
    // Remove any orphaned opening tags (no matching close at all)
    cleaned = cleaned.replace(/<\/?tool_call>/g, '')
    // Remove action suggestions
    cleaned = cleaned.replace(/<action_suggestion>.*?<\/?action_suggestion>/gs, '')
    cleaned = cleaned.replace(/<\/?action_suggestion>/g, '')
    // Remove followups tags
    cleaned = cleaned.replace(FOLLOWUPS_REGEX, '')
    // Collapse excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()
    return cleaned
  }

  return {
    async run(input: {
      message: string
      context: AnalysisContext
      recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>
      summary: string | null
      toolContext: ToolContext
    }): Promise<AnalysisGraphResult> {
      const allToolCalls: ToolCallRecord[] = []
      const toolDescriptions = buildToolDescriptions()
      let accumulatedToolResults = ''

      for (let round = 0; round < MAX_ROUNDS; round++) {
        const builtInput = buildInput({
          message: input.message,
          context: input.context,
          recentTurns: input.recentTurns,
          summary: input.summary,
          toolDescriptions,
          toolResults: accumulatedToolResults || undefined,
        })

        const response = await llm.generate({
          instructions: SYSTEM_PROMPT,
          input: builtInput,
        })

        const llmText = response.text
        const requestedCalls = parseToolCalls(llmText)

        // No tool calls → final answer
        if (requestedCalls.length === 0) {
          return {
            response: cleanResponse(llmText),
            toolCalls: allToolCalls,
            suggestedFollowups: parseFollowups(llmText),
            actionSuggestions: parseActionSuggestions(llmText),
          }
        }

        // Execute each tool call
        const roundResults: string[] = []
        for (const call of requestedCalls) {
          const startMs = Date.now()
          const result = await executeAnalysisTool(call.name, call.args, input.toolContext)
          const durationMs = Date.now() - startMs

          const record: ToolCallRecord = {
            name: call.name,
            args: call.args,
            result: JSON.stringify(result.data ?? { error: result.error }),
            duration_ms: durationMs,
          }
          allToolCalls.push(record)

          roundResults.push(
            `Tool result for ${call.name}:\n${record.result}`,
          )
        }

        accumulatedToolResults += (accumulatedToolResults ? '\n\n' : '') + roundResults.join('\n\n')
      }

      // If we exhausted max rounds, do one final call without tool descriptions
      // to force a summary answer
      const finalInput = buildInput({
        message: `${input.message}\n\n(You have already called tools. Please provide your final answer based on the tool results above. Do not call any more tools.)`,
        context: input.context,
        recentTurns: input.recentTurns,
        summary: input.summary,
        toolDescriptions: '',
        toolResults: accumulatedToolResults,
      })

      const finalResponse = await llm.generate({
        instructions: SYSTEM_PROMPT,
        input: finalInput,
      })

      return {
        response: cleanResponse(finalResponse.text),
        toolCalls: allToolCalls,
        suggestedFollowups: parseFollowups(finalResponse.text),
        actionSuggestions: parseActionSuggestions(finalResponse.text),
      }
    },
  }
}
