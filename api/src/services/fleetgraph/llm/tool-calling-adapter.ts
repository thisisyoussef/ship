/**
 * OpenAI Tool-Calling Adapter
 *
 * Extends the OpenAI Responses API integration to support tool-calling
 * via the `tools` parameter. Produces structured output with both
 * text content and function_call items.
 */

import type {
  LLMGenerateRequest,
  LLMGenerateResponse,
  LLMToolCallingAdapter,
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
        errorDetail = errorBody?.error?.message
          ? `: ${errorBody.error.message}`
          : ''
      } catch {
        // Ignore parse errors on error responses
      }
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

    const response = await this.fetchFn(`${this.config.baseUrl}/responses`, {
      body: JSON.stringify({
        input: request.messages,
        instructions: request.instructions,
        max_output_tokens: request.maxOutputTokens,
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
        errorDetail = errorBody?.error?.message
          ? `: ${errorBody.error.message}`
          : ''
      } catch {
        // Ignore parse errors on error responses
      }
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
