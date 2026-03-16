import { normalizeShipDocument } from './documents.js'
import {
  parseTriggerEnvelope,
  parseShipContextEnvelopeInput,
  type ContextBreadcrumb,
  type NormalizedContextDocumentSummary,
  type ShipContextEnvelope,
  type TriggerEnvelope,
} from './types.js'

function normalizeSummary(input: {
  child_count?: number
  depth?: number
  document_type: string
  id: string
  ticket_number?: number
  title: string
}): NormalizedContextDocumentSummary {
  return {
    childCount: input.child_count,
    depth: input.depth,
    documentType: input.document_type,
    id: input.id,
    ticketNumber: input.ticket_number,
    title: input.title,
  }
}

function normalizeBreadcrumb(input: {
  id: string
  ticket_number?: number
  title: string
  type: string
}): ContextBreadcrumb {
  return {
    documentType: input.type,
    id: input.id,
    ticketNumber: input.ticket_number,
    title: input.title,
  }
}

export function createTriggerEnvelope(input: unknown): TriggerEnvelope {
  return parseTriggerEnvelope(input)
}

export function createShipContextEnvelope(input: unknown): ShipContextEnvelope {
  const parsed = parseShipContextEnvelopeInput(input)

  return {
    ancestors: parsed.context.ancestors.map(normalizeSummary),
    breadcrumbs: parsed.context.breadcrumbs.map(normalizeBreadcrumb),
    children: parsed.context.children.map(normalizeSummary),
    current: normalizeShipDocument({
      belongs_to: parsed.context.belongs_to,
      document_type: parsed.context.current.document_type,
      id: parsed.context.current.id,
      program_id: parsed.context.current.program_id,
      ticket_number: parsed.context.current.ticket_number,
      title: parsed.context.current.title,
      workspace_id: parsed.trigger.workspaceId,
    }),
    route: parsed.route,
    trigger: parsed.trigger,
  }
}
