/**
 * OpenAI Tool-Calling Adapter
 *
 * Uses the OpenAI Responses API (/v1/responses) with tools.
 *
 * IMPORTANT: The Responses API uses a different message format than Chat
 * Completions. The `input` array contains "items" — not "messages":
 *   - { role: "user", content: "..." }           → user message
 *   - { type: "function_call", call_id, name, arguments }  → tool call
 *   - { type: "function_call_output", call_id, output }    → tool result
 *
 * The Chat Completions style (role: "assistant" with tool_calls array,
 * role: "tool" with tool_call_id) is NOT accepted by the Responses API.
 *
 * This adapter accepts our internal ChatMessage format (Chat Completions
 * style) and converts it to Responses API items before sending.
 *
 * Reference: https://developers.openai.com/cookbook/examples/responses_api/responses_api_tool_orchestration
 */

import type {
  LLMGenerateRequest,
  LLMGenerateResponse,
  LLMToolCallingAdapter,
  LLMToolCallingMessage,
  LLMToolCallingOutputItem,
  LLMToolCallingRequest,
  LLMToolCallingResponse,
  LLMToolSchema,
  LLMUsage,
} from './types.js'

interface OpenAIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

// Responses API input item types
type ResponsesInputItem =
  | { role: 'user'; content: string }
  | { role: 'system'; content: string }
  | { type: 'function_call'; call_id: string; name: string; arguments: string }
  | { type: 'function_call_output'; call_id: string; output: string }

export class OpenAIToolCallingAdapter implements LLMToolCallingAdapter {
  public readonly model: string
  public readonly provider = 'openai' as const

  public constructor(
    private readonly config: OpenAIConfig,
    private readonly fetchFn: typeof fetch
  ) {
    this.model = config.model
  }

  /**
   * Plain text generation (satisfies base LLMAdapter interface).
   */
  public async generate(
    request: LLMGenerateRequest
  ): Promise<LLMGenerateResponse> {
    if (!this.config.apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required for FleetGraph OpenAI provider.'
      )
    }

    const response = await this.fetchFn(`${this.config.baseUrl}/responses`, {
      body: JSON.stringify({
        input: request.input,
        instructions: request.instructions,
        max_output_tokens: request.maxOutputTokens,
        model: this.config.model,
        temperature: request.temperature,
      }),
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    if (!response.ok) {
      let errorDetail = ''
      try {
        const errorBody = await response.json() as { error?: { message?: string } }
        errorDetail = errorBody?.error?.message ? `: ${errorBody.error.message}` : ''
      } catch { /* ignore parse errors */ }
      throw new Error(
        `OpenAI Responses request failed with ${response.status}${errorDetail}`
      )
    }

    const payload = (await response.json()) as OpenAIResponsePayload
    const text = extractTextFromOutput(payload)

    return {
      model: payload.model || this.config.model,
      provider: this.provider,
      text,
      usage: normalizeUsage(payload.usage),
    }
  }

  /**
   * Tool-calling generation via the OpenAI Responses API.
   *
   * Converts internal ChatMessage format to Responses API items:
   *   assistant message with tool_calls → individual function_call items
   *   tool message with tool_call_id → function_call_output item
   */
  public async generateWithTools(
    request: LLMToolCallingRequest
  ): Promise<LLMToolCallingResponse> {
    if (!this.config.apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required for FleetGraph OpenAI provider.'
      )
    }

    const tools = request.tools.map(formatToolForAPI)
    const input = convertMessagesToResponsesInput(request.messages)

    const response = await this.fetchFn(`${this.config.baseUrl}/responses`, {
      body: JSON.stringify({
        input,
        instructions: request.instructions,
        model: this.config.model,
        temperature: request.temperature,
        tools,
      }),
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    if (!response.ok) {
      let errorDetail = ''
      try {
        const errorBody = await response.json() as { error?: { message?: string } }
        errorDetail = errorBody?.error?.message ? `: ${errorBody.error.message}` : ''
      } catch { /* ignore parse errors */ }
      throw new Error(
        `OpenAI Responses tool-calling request failed with ${response.status}${errorDetail}`
      )
    }

    const payload = (await response.json()) as OpenAIResponsePayload
    const output = parseOutputItems(payload)

    return {
      model: payload.model || this.config.model,
      output,
      provider: this.provider,
      usage: normalizeUsage(payload.usage),
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Message format conversion
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Converts internal ChatMessage array (Chat Completions style) to
 * OpenAI Responses API input items.
 *
 * Chat Completions format:
 *   { role: "assistant", content: "...", tool_calls: [...] }
 *   { role: "tool", content: "...", tool_call_id: "..." }
 *
 * Responses API format:
 *   { type: "function_call", call_id: "...", name: "...", arguments: "..." }
 *   { type: "function_call_output", call_id: "...", output: "..." }
 */
function convertMessagesToResponsesInput(
  messages: LLMToolCallingMessage[]
): ResponsesInputItem[] {
  const items: ResponsesInputItem[] = []

  for (const msg of messages) {
    // System messages — pass through (instructions handle this, but include
    // for completeness if present in the messages array)
    if (msg.role === 'system') {
      // Skip system messages — they go in the `instructions` field
      continue
    }

    // User messages — pass through
    if (msg.role === 'user') {
      items.push({ role: 'user', content: msg.content })
      continue
    }

    // Assistant messages — may contain tool_calls
    if (msg.role === 'assistant') {
      // If the assistant produced text, emit it as a user-role context
      // (the Responses API doesn't have an "assistant" input role for
      // multi-turn; the model's prior output is represented by
      // function_call items, not assistant messages)
      //
      // For assistant messages WITHOUT tool calls, we include the text
      // so the model sees its prior response in conversation history.
      if (msg.content && (!msg.tool_calls || msg.tool_calls.length === 0)) {
        // Include as a message item with role to preserve conversation context
        items.push({ role: 'user', content: `[Previous assistant response]: ${msg.content}` })
        continue
      }

      // For assistant messages WITH tool_calls, emit each tool call as
      // a function_call item (the Responses API format)
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          items.push({
            type: 'function_call',
            call_id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          })
        }
      }
      continue
    }

    // Tool result messages — convert to function_call_output
    if (msg.role === 'tool' && msg.tool_call_id) {
      items.push({
        type: 'function_call_output',
        call_id: msg.tool_call_id,
        output: msg.content,
      })
      continue
    }
  }

  return items
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

interface OpenAIResponsePayload {
  model?: string
  output?: Array<{
    type?: string
    content?: Array<{ type?: string; text?: string }>
    // function_call output items
    id?: string
    name?: string
    arguments?: string
    call_id?: string
  }>
  output_text?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}

function formatToolForAPI(
  tool: LLMToolSchema
): { type: 'function'; name: string; description: string; parameters: object } {
  return {
    type: 'function',
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  }
}

function parseOutputItems(
  payload: OpenAIResponsePayload
): LLMToolCallingOutputItem[] {
  if (!payload.output) {
    // Fall back to output_text if present
    if (payload.output_text?.trim()) {
      return [{ type: 'text', text: payload.output_text.trim() }]
    }
    return []
  }

  const items: LLMToolCallingOutputItem[] = []

  for (const item of payload.output) {
    if (item.type === 'function_call') {
      items.push({
        type: 'function_call',
        id: item.call_id || item.id || '',
        name: item.name || '',
        arguments: item.arguments || '{}',
      })
    } else if (item.type === 'message' && item.content) {
      const text = item.content
        .filter((c) => c.type === 'output_text' || c.type === 'text')
        .map((c) => c.text || '')
        .join('')
        .trim()
      if (text) {
        items.push({ type: 'text', text })
      }
    }
  }

  return items
}

function extractTextFromOutput(payload: OpenAIResponsePayload): string {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim()
  }

  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .map((part) => part.text || '')
    .join('')
    .trim()

  if (!text) {
    throw new Error('OpenAI Responses payload did not contain text.')
  }

  return text
}

function normalizeUsage(usage?: {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
}): LLMUsage | undefined {
  if (!usage) return undefined
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
  }
}
