import type { LLMAdapter } from '../../fleetgraph/llm/types.js'
import type { AnalysisContext, ToolCallRecord, ToolContext } from '../types.js'
import { ALL_ANALYSIS_TOOLS, executeAnalysisTool, getToolSchemas } from './tool-registry.js'

// ── Types ────────────────────────────────────────────────────────

export interface AnalysisGraphResult {
  response: string
  toolCalls: ToolCallRecord[]
  suggestedFollowups: string[]
}

export interface AnalysisGraphDeps {
  llm: LLMAdapter
}

// ── Constants ────────────────────────────────────────────────────

const MAX_ROUNDS = 5

const SYSTEM_PROMPT = `You are a Ship analysis assistant. You analyze project data and answer questions using tools.

## Your Context
You are embedded in Ship, a project management tool. The user is viewing a specific page.
The analysis_context_get tool returns exactly what they're looking at.

## How to Work
1. ALWAYS start by understanding the context — call analysis_context_get if you haven't already.
2. When asked about an entity, call entity_snapshot_get to get its current state.
3. For trends and history, use metric_timeseries_get.
4. For related work, use graph_neighbors_get.
5. For comparisons, use compare_entities_get.
6. For "why" questions, use anomaly_explain_get.
7. For evidence and proof, use evidence_lookup_get.

## Tool Calling
When you need to call a tool, use this exact format:
<tool_call>{"name": "tool_name", "args": {...}}</tool_call>

You may call multiple tools in one response. Wait for all tool results before providing your final answer.

## Response Rules
- Every numerical claim MUST come from a tool result. Never guess.
- Be specific: say "Sprint 14 has 3 open issues" not "the sprint has some issues."
- Keep answers concise — 2-4 sentences for simple questions.
- After answering, suggest 2-3 follow-up questions the user might want to ask.
- Format follow-ups as a JSON array in your response, wrapped in <followups>["q1","q2","q3"]</followups> tags.`

const TOOL_CALL_REGEX = /<tool_call>(.*?)<\/tool_call>/gs
const FOLLOWUPS_REGEX = /<followups>(.*?)<\/followups>/s

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

  function cleanResponse(text: string): string {
    // Remove tool_call and followups tags from the final response
    return text
      .replace(TOOL_CALL_REGEX, '')
      .replace(FOLLOWUPS_REGEX, '')
      .trim()
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
      }
    },
  }
}
