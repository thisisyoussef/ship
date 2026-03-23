import { z } from 'zod'

import {
  FLEETGRAPH_MODES,
  FLEETGRAPH_TRIGGERS,
} from '../graph/types.js'

const SHIP_DOCUMENT_TYPES = [
  'wiki',
  'issue',
  'program',
  'project',
  'sprint',
  'person',
  'weekly_plan',
  'weekly_retro',
  'standup',
  'weekly_review',
] as const

const SHIP_RELATIONSHIP_TYPES = [
  'program',
  'project',
  'sprint',
  'parent',
] as const

const ROUTE_SURFACES = [
  'document-page',
  'workspace-sweep',
  'background-event',
] as const

const nonEmptyString = z.string().min(1)
const optionalNullableString = nonEmptyString.nullable().optional()
const optionalNormalizedString = z.preprocess(
  (value) => (value === null ? undefined : value),
  nonEmptyString.optional()
)

function toInteger(value: unknown) {
  if (value === null) {
    return undefined
  }

  if (typeof value === 'string' && value.trim()) {
    return Number.parseInt(value, 10)
  }

  return value
}

export const RawBelongsToEntrySchema = z.object({
  color: optionalNormalizedString,
  document_type: optionalNormalizedString,
  id: nonEmptyString,
  title: optionalNormalizedString,
  type: z.enum(SHIP_RELATIONSHIP_TYPES),
}).strict()

export const RawShipDocumentSchema = z.object({
  accountable_id: optionalNullableString,
  assignee_id: optionalNullableString,
  belongs_to: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(RawBelongsToEntrySchema)
  ).default([]),
  content: z.unknown().optional(),
  document_type: z.enum(SHIP_DOCUMENT_TYPES),
  id: nonEmptyString,
  owner_id: optionalNullableString,
  parent_id: optionalNullableString,
  program_id: optionalNullableString,
  project_id: optionalNullableString,
  properties: z.record(z.unknown()).optional().default({}),
  sprint_id: optionalNullableString,
  ticket_number: z.preprocess(
    toInteger,
    z.number().int().nonnegative().nullable().optional()
  ),
  title: z.string(),
  workspace_id: optionalNullableString,
}).strict()

const ContextDocumentSchema = z.object({
  child_count: z.preprocess(
    toInteger,
    z.number().int().nonnegative().optional()
  ),
  depth: z.preprocess(
    toInteger,
    z.number().int().nonnegative().optional()
  ),
  document_type: nonEmptyString,
  id: nonEmptyString,
  ticket_number: z.preprocess(
    toInteger,
    z.number().int().nonnegative().optional()
  ),
  title: z.string(),
}).strict()

const CurrentContextDocumentSchema = ContextDocumentSchema.extend({
  program_color: optionalNullableString,
  program_id: optionalNullableString,
  program_name: optionalNullableString,
})

const BreadcrumbSchema = z.object({
  id: nonEmptyString,
  ticket_number: z.preprocess(
    toInteger,
    z.number().int().nonnegative().optional()
  ),
  title: z.string(),
  type: nonEmptyString,
}).strict()

export const RawDocumentContextSchema = z.object({
  ancestors: z.array(ContextDocumentSchema),
  belongs_to: z.array(RawBelongsToEntrySchema),
  breadcrumbs: z.array(BreadcrumbSchema),
  children: z.array(ContextDocumentSchema),
  current: CurrentContextDocumentSchema,
}).strict()

export const TriggerEnvelopeSchema = z.object({
  actorId: nonEmptyString.optional(),
  documentId: nonEmptyString.optional(),
  documentType: z.enum(SHIP_DOCUMENT_TYPES).optional(),
  mode: z.enum(FLEETGRAPH_MODES),
  threadId: nonEmptyString,
  trigger: z.enum(FLEETGRAPH_TRIGGERS),
  workspaceId: nonEmptyString,
}).strict()

export const RouteSurfaceSchema = z.object({
  activeTab: nonEmptyString.optional(),
  nestedPath: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(nonEmptyString)
  ).default([]),
  surface: z.enum(ROUTE_SURFACES).default('document-page'),
}).strict()

export const ShipContextEnvelopeInputSchema = z.object({
  context: RawDocumentContextSchema,
  route: RouteSurfaceSchema,
  trigger: TriggerEnvelopeSchema,
}).strict()

export type RawBelongsToEntry = z.infer<typeof RawBelongsToEntrySchema>
export type RawShipDocument = z.infer<typeof RawShipDocumentSchema>
export type RawDocumentContext = z.infer<typeof RawDocumentContextSchema>
export type TriggerEnvelope = z.infer<typeof TriggerEnvelopeSchema>
export type RouteSurface = z.infer<typeof RouteSurfaceSchema>

export interface NormalizedAssociation {
  color?: string
  documentType?: string
  id: string
  title?: string
  type: RawBelongsToEntry['type']
}

export interface NormalizedRelationships {
  parentId?: string
  programId?: string
  projectId?: string
  sprintId?: string
}

export interface NormalizedAssignments {
  accountableId?: string
  assigneeId?: string
  assigneeIds: string[]
  ownerId?: string
}

export interface NormalizedLegacyFields {
  assigneeIds: string[]
  projectId?: string
}

export interface NormalizedShipDocument {
  assignments: NormalizedAssignments
  canonicalAssociations: NormalizedAssociation[]
  documentType: RawShipDocument['document_type']
  id: string
  legacy: NormalizedLegacyFields
  relationships: NormalizedRelationships
  ticketNumber?: number
  title: string
  workspaceId?: string
}

export interface NormalizedContextDocumentSummary {
  childCount?: number
  depth?: number
  documentType: string
  id: string
  ticketNumber?: number
  title: string
}

export interface ContextBreadcrumb {
  documentType: string
  id: string
  ticketNumber?: number
  title: string
}

export interface ShipContextEnvelope {
  ancestors: NormalizedContextDocumentSummary[]
  breadcrumbs: ContextBreadcrumb[]
  children: NormalizedContextDocumentSummary[]
  current: NormalizedShipDocument
  route: RouteSurface
  trigger: TriggerEnvelope
}

export function parseRawShipDocument(input: unknown): RawShipDocument {
  return RawShipDocumentSchema.parse(input)
}

export function parseTriggerEnvelope(input: unknown): TriggerEnvelope {
  return TriggerEnvelopeSchema.parse(input)
}

export function parseShipContextEnvelopeInput(input: unknown) {
  return ShipContextEnvelopeInputSchema.parse(input)
}
