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

CRITICAL: When calling tools, output ONLY the tool_call tags. Do NOT narrate what you are about to do. Do NOT say "Let me check..." or "I'll gather..." before tool calls. Just call the tools directly.

## Response Rules
- Every numerical claim MUST come from a tool result. Never guess or make up numbers.
- Be specific: say "Sprint 14 has 3 open issues" not "the sprint has some issues."
- Use names and dates, not IDs.
- Keep answers concise — 2-4 paragraphs for initial analysis, 1-2 for followups.
- Do NOT mention internal fields like "confidence level", "confidence_score", "performance_rating", or "monetary_impact" — these are internal metrics irrelevant to the user.
- Do NOT regurgitate raw JSON or internal field names. Translate everything to plain English.
- When discussing sprints: mention status, owner, issue count, plan status, and what needs to happen next.
- When discussing projects: mention status, owner, target date, open issues, and recent activity.
- When the user says they applied an action, call tools to get the UPDATED state, then provide a concise summary of what changed. Do not narrate your process — just call the tools and answer.
- NEVER output a response that only describes what you're about to do. Either call tools OR give a final answer — never just announce your intentions.

## Suggestions & Advice
When your analysis reveals opportunities, suggest them using this format:
<action_suggestion>{"action": "category", "target_id": "entity_id", "target_type": "entity_type", "label": "Short label", "rationale": "Why this matters"}</action_suggestion>

Categories (use the closest match, or invent your own):
- start_week: Start a sprint that is in planning status
- approve_week_plan: Approve a submitted sprint plan
- approve_project_plan: Approve a submitted project plan
- assign_owner: Assign an owner to a sprint or project
- assign_issues: Assign unassigned sprint issues to team members
- post_comment: Post a comment on any entity
- post_standup: Post a standup update for a sprint
- escalate_risk: Flag a risk on an entity
- rebalance_load: Redistribute work from overloaded team members
- scope_concern: Sprint scope seems too large or too small
- team_health: A team member may need support, recognition, or a 1:1
- process_improvement: A workflow or habit could be improved
- planning_advice: Planning gap, scheduling concern, or missing context
- general_insight: Any other observation worth surfacing

You are not limited to Ship mutations. Advisory suggestions that help the user think are just as valuable. Suggest 1-3 items when there is a clear reason. The user sees these as informational notices.

## Role Context
Adapt your analysis style based on the entity being viewed:

- **Sprint/Week pages** (PM context): Focus on plan health, approval status, workload distribution, and delivery risk. Suggest plan approvals, owner assignments, and sprint starts.
- **Project pages** (PM/Director context): Focus on overall progress, target date risk, cross-sprint trends, and resource allocation.
- **Issue pages** (Engineer context): Focus on blockers, priority, next actions, and related work.
- **Program pages** (Director context): Focus on portfolio-level risks, project health comparison, and strategic alignment.

## Follow-up Suggestions
After answering, suggest 2-3 follow-up questions in this format:
<followups>["question 1", "question 2", "question 3"]</followups>`

const FOLLOWUPS_REGEX = /<followups>(.*?)<\/followups>/s

/**
 * Robust tag-content extractor that handles all LLM output variants:
 * - Proper: <tag>JSON</tag>
 * - Self-closing style: <tag>JSON<tag>
 * - Escaped slash: <tag>JSON<\/tag>
 * - Bare JSON with escaped closer: JSON<\/tag>
 * - Mixed: any combination
 */
function collectTaggedBlocks(text: string, tagName: string): { cleanedText: string; payloads: string[] } {
  const payloads: string[] = []

  // Normalize escaped-slash closing tags: <\/tag> → </tag>
  let normalized = text.replace(new RegExp(`<\\\\/\\s*${tagName}\\s*>`, 'g'), `</${tagName}>`)

  const openTag = `<${tagName}>`
  const closeTag = `</${tagName}>`
  let cleaned = ''
  let cursor = 0

  while (cursor < normalized.length) {
    const openIdx = normalized.indexOf(openTag, cursor)

    if (openIdx === -1) {
      // No more opening tags — check for bare JSON followed by close tag
      const closeIdx = normalized.indexOf(closeTag, cursor)
      if (closeIdx !== -1) {
        const candidate = normalized.slice(cursor, closeIdx).trim()
        if (candidate.startsWith('{') && candidate.endsWith('}')) {
          payloads.push(candidate)
          cursor = closeIdx + closeTag.length
          continue
        }
      }
      cleaned += normalized.slice(cursor)
      break
    }

    // Add text before the opening tag
    cleaned += normalized.slice(cursor, openIdx)

    // Find the closing tag after the opener
    const afterOpen = openIdx + openTag.length
    const closeIdx = normalized.indexOf(closeTag, afterOpen)

    if (closeIdx === -1) {
      // No closing tag — check if there's another opening tag used as closer
      const nextOpenIdx = normalized.indexOf(openTag, afterOpen)
      if (nextOpenIdx !== -1) {
        const candidate = normalized.slice(afterOpen, nextOpenIdx).trim()
        if (candidate.startsWith('{')) {
          payloads.push(candidate)
        }
        cursor = nextOpenIdx // Don't skip — it might be another opener
        continue
      }
      // Trailing content after opener with no closer
      const trailing = normalized.slice(afterOpen).trim()
      if (trailing.startsWith('{') && trailing.endsWith('}')) {
        payloads.push(trailing)
      }
      break
    }

    // Normal case: <tag>JSON</tag>
    const payload = normalized.slice(afterOpen, closeIdx).trim()
    if (payload) {
      payloads.push(payload)
    }
    cursor = closeIdx + closeTag.length
  }

  // Final cleanup: remove any remaining tags
  cleaned = cleaned.replace(new RegExp(`<\\/?${tagName}>`, 'g'), '')
  // Remove any leftover escaped-slash tags that weren't normalized
  cleaned = cleaned.replace(new RegExp(`<\\\\?\\/${tagName}>`, 'g'), '')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()

  return { cleanedText: cleaned, payloads }
}

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
    for (const payload of collectTaggedBlocks(text, 'tool_call').payloads) {
      try {
        const parsed = JSON.parse(payload) as { name: string; args: Record<string, unknown> }
        if (parsed.name && typeof parsed.name === 'string') {
          calls.push({ name: parsed.name, args: parsed.args ?? {} })
        }
      } catch {
        // Skip malformed
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
    for (const payload of collectTaggedBlocks(text, 'action_suggestion').payloads) {
      try {
        const parsed = JSON.parse(payload) as {
          action: string
          target_id: string
          target_type: string
          label: string
          rationale: string
        }
        // Accept any category — the analysis tab renders all suggestions as notices
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
    let cleaned = collectTaggedBlocks(text, 'tool_call').cleanedText
    cleaned = collectTaggedBlocks(cleaned, 'action_suggestion').cleanedText
    cleaned = cleaned.replace(FOLLOWUPS_REGEX, '')
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
      const toolCallCache = new Map<string, string>()
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

        // No tool calls → check if we should force more tool usage or return final answer
        if (requestedCalls.length === 0) {
          const cleaned = cleanResponse(llmText)

          // Anti-narration guard: if we're early in the loop and the model is just
          // narrating ("Let me check...", "I'll pull...") without calling data tools,
          // force it to actually call tools. This catches the common pattern where the
          // LLM calls analysis_context_get (free) then narrates instead of fetching data.
          const onlyCalledContextTool = allToolCalls.length > 0 &&
            allToolCalls.every(tc => tc.name === 'analysis_context_get')
          const isNarrationOnly = cleaned.length < 500 && (
            cleaned.includes('I will') || cleaned.includes("I'll") ||
            cleaned.includes('Let me') || cleaned.includes('Next Steps') ||
            cleaned.includes('retrieve') || cleaned.includes('pull') ||
            cleaned.includes('gather') || cleaned.includes('check the')
          )

          if (round < MAX_ROUNDS - 1 && (onlyCalledContextTool || (isNarrationOnly && allToolCalls.length === 0))) {
            // Force the model to call entity_snapshot_get by injecting a nudge
            accumulatedToolResults += (accumulatedToolResults ? '\n\n' : '') +
              'SYSTEM: You narrated your intent but did not call tools. Call entity_snapshot_get now with the entity_id from the context. Do not narrate — just output the <tool_call> tag.'
            continue
          }

          // Short response after tool calls — retry
          if (cleaned.length < 50 && allToolCalls.length > 0 && round < MAX_ROUNDS - 1) {
            continue
          }

          return {
            response: cleaned,
            toolCalls: allToolCalls,
            suggestedFollowups: parseFollowups(llmText),
            actionSuggestions: parseActionSuggestions(llmText),
          }
        }

        // Execute each tool call (deduplicate within this run)
        const roundResults: string[] = []
        for (const call of requestedCalls) {
          const cacheKey = JSON.stringify({ name: call.name, args: call.args })
          const cached = toolCallCache.get(cacheKey)
          if (cached) {
            // Record the cached call for audit trail
            allToolCalls.push({
              name: call.name,
              args: call.args,
              result: cached,
              duration_ms: 0, // cached, no execution
            })
            roundResults.push(`Tool result for ${call.name}:\n${cached}`)
            continue
          }

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
          toolCallCache.set(cacheKey, record.result)

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
