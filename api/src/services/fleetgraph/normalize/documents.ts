import {
  parseRawShipDocument,
  type NormalizedAssociation,
  type NormalizedShipDocument,
  type RawBelongsToEntry,
} from './types.js'

function getStringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => getStringValue(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function dedupe(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function normalizeAssociations(
  belongsTo: RawBelongsToEntry[]
): NormalizedAssociation[] {
  return belongsTo.map((entry) => ({
    color: entry.color,
    documentType: entry.document_type,
    id: entry.id,
    title: entry.title,
    type: entry.type,
  }))
}

function findAssociationId(
  associations: NormalizedAssociation[],
  type: RawBelongsToEntry['type']
) {
  return associations.find((association) => association.type === type)?.id
}

export function normalizeShipDocument(input: unknown): NormalizedShipDocument {
  const parsed = parseRawShipDocument(input)
  const props = parsed.properties || {}
  const canonicalAssociations = normalizeAssociations(parsed.belongs_to)
  const legacyProjectId =
    getStringValue(parsed.project_id) || getStringValue(props.project_id)
  const legacyAssigneeIds = getStringArray(props.assignee_ids)
  const assigneeId =
    getStringValue(parsed.assignee_id) || getStringValue(props.assignee_id)
  const ownerId =
    getStringValue(parsed.owner_id) || getStringValue(props.owner_id)
  const accountableId =
    getStringValue(parsed.accountable_id) ||
    getStringValue(props.accountable_id)

  return {
    assignments: {
      accountableId,
      assigneeId,
      assigneeIds: dedupe([assigneeId, ...legacyAssigneeIds]),
      ownerId,
    },
    canonicalAssociations,
    documentType: parsed.document_type,
    id: parsed.id,
    legacy: {
      assigneeIds: legacyAssigneeIds,
      projectId: legacyProjectId,
    },
    relationships: {
      parentId:
        findAssociationId(canonicalAssociations, 'parent') ||
        getStringValue(parsed.parent_id),
      programId:
        findAssociationId(canonicalAssociations, 'program') ||
        getStringValue(parsed.program_id) ||
        getStringValue(props.program_id),
      projectId:
        findAssociationId(canonicalAssociations, 'project') ||
        legacyProjectId,
      sprintId:
        findAssociationId(canonicalAssociations, 'sprint') ||
        getStringValue(parsed.sprint_id) ||
        getStringValue(props.sprint_id),
    },
    ticketNumber: parsed.ticket_number ?? undefined,
    title: parsed.title,
    workspaceId: getStringValue(parsed.workspace_id),
  }
}

