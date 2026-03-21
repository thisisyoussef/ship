/**
 * Zod → JSON Schema utility for OpenAI tool definitions.
 *
 * Handles the common Zod types used by FleetGraph tool parameter schemas.
 * This is intentionally minimal — we only cover what our tools actually use.
 */

import { type ZodSchema, type ZodTypeAny, z } from 'zod'

import type { LLMToolSchema } from '../../llm/types.js'

// ──────────────────────────────────────────────────────────────────────────────
// zodToJsonSchema
// ──────────────────────────────────────────────────────────────────────────────

export function zodToJsonSchema(schema: ZodSchema): object {
  return convertZodType(schema as ZodTypeAny)
}

function convertZodType(schema: ZodTypeAny): Record<string, unknown> {
  const def = schema._def

  // Unwrap ZodOptional → mark in parent object
  if (def.typeName === 'ZodOptional') {
    return convertZodType(def.innerType)
  }

  // Unwrap ZodNullable → add null
  if (def.typeName === 'ZodNullable') {
    const inner = convertZodType(def.innerType)
    return { ...inner, nullable: true }
  }

  // ZodDefault → unwrap
  if (def.typeName === 'ZodDefault') {
    return convertZodType(def.innerType)
  }

  // Primitives
  if (def.typeName === 'ZodString') {
    return { type: 'string' }
  }

  if (def.typeName === 'ZodNumber') {
    return { type: 'number' }
  }

  if (def.typeName === 'ZodBoolean') {
    return { type: 'boolean' }
  }

  // Enum
  if (def.typeName === 'ZodEnum') {
    return { type: 'string', enum: def.values }
  }

  // Array
  if (def.typeName === 'ZodArray') {
    return {
      type: 'array',
      items: convertZodType(def.type),
    }
  }

  // Object
  if (def.typeName === 'ZodObject') {
    const shape = def.shape() as Record<string, ZodTypeAny>
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertZodType(value)
      // If the field is not optional, it's required
      if (value._def.typeName !== 'ZodOptional') {
        required.push(key)
      }
    }

    const result: Record<string, unknown> = {
      type: 'object',
      properties,
    }
    if (required.length > 0) {
      result.required = required
    }
    return result
  }

  // Fallback — treat as opaque object
  return { type: 'object' }
}

// ──────────────────────────────────────────────────────────────────────────────
// buildToolSchema
// ──────────────────────────────────────────────────────────────────────────────

export function buildToolSchema(def: {
  name: string
  description: string
  parameters: ZodSchema
}): LLMToolSchema {
  return {
    type: 'function',
    function: {
      name: def.name,
      description: def.description,
      parameters: zodToJsonSchema(def.parameters),
    },
  }
}
