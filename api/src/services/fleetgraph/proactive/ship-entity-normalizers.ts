import { calculateWeekStartDate } from './sprint-utils.js'
import type {
  ShipIssue,
  ShipProject,
  ShipWeek,
} from '../graph/types-v2.js'

type JsonRecord = Record<string, unknown>

interface IssueDefaults {
  projectId?: string
  sprintId?: string
}

interface WeekDefaults {
  projectId?: string
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const strings = value.filter((entry): entry is string =>
    typeof entry === 'string' && entry.trim().length > 0
  )

  return strings.length > 0 ? strings : undefined
}

function getProperties(raw: JsonRecord): JsonRecord {
  const properties = asRecord(raw.properties)
  return properties ? { ...properties } : {}
}

function mergeTopLevelProperties(
  properties: JsonRecord,
  raw: JsonRecord,
  keys: string[]
): JsonRecord {
  const merged = { ...properties }

  for (const key of keys) {
    if (merged[key] === undefined && raw[key] !== undefined) {
      merged[key] = raw[key]
    }
  }

  return merged
}

function getAssociationId(raw: JsonRecord, type: string): string | undefined {
  const belongsTo = Array.isArray(raw.belongs_to) ? raw.belongs_to : []
  const match = belongsTo.find((entry) => {
    const record = asRecord(entry)
    return record?.type === type && typeof record.id === 'string'
  })

  const record = asRecord(match)
  return asString(record?.id)
}

function computeSprintDates(
  workspaceSprintStartDate: string | undefined,
  sprintNumber: number | undefined
): { sprintStartDate?: string; sprintEndDate?: string } {
  if (!workspaceSprintStartDate || !sprintNumber) {
    return {}
  }

  const startDate = calculateWeekStartDate(workspaceSprintStartDate, sprintNumber)
  const endDate = new Date(startDate)
  endDate.setUTCDate(startDate.getUTCDate() + 6)

  return {
    sprintEndDate: endDate.toISOString(),
    sprintStartDate: startDate.toISOString(),
  }
}

export function normalizeShipIssue(
  rawValue: unknown,
  defaults: IssueDefaults = {}
): ShipIssue | null {
  const raw = asRecord(rawValue)
  if (!raw) {
    return null
  }

  const properties = getProperties(raw)
  const id = asString(raw.id)
  const title = asString(raw.title) ?? asString(raw.name)

  if (!id || !title) {
    return null
  }

  const assigneeId = asString(raw.assignee_id) ?? asString(properties.assignee_id)
  const sprintId = defaults.sprintId
    ?? asString(raw.sprint_id)
    ?? asString(properties.sprint_id)
    ?? getAssociationId(raw, 'sprint')
  const projectId = defaults.projectId
    ?? asString(raw.project_id)
    ?? asString(properties.project_id)
    ?? getAssociationId(raw, 'project')

  return {
    assigneeId,
    blockerText: asString(raw.blocker_text) ?? asString(properties.blocker_text),
    estimate: asNumber(raw.estimate) ?? asNumber(properties.estimate),
    id,
    lastUpdatedAt: asString(raw.updated_at) ?? asString(raw.updatedAt),
    priority: asString(raw.priority) ?? asString(properties.priority),
    projectId,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
    sprintId,
    state: asString(raw.state) ?? asString(raw.status) ?? asString(properties.state) ?? 'backlog',
    title,
  }
}

export function normalizeShipIssueList(
  rawValues: unknown[],
  defaults: IssueDefaults = {}
): ShipIssue[] {
  return rawValues
    .map((value) => normalizeShipIssue(value, defaults))
    .filter((value): value is ShipIssue => value !== null)
}

export function normalizeShipWeek(
  rawValue: unknown,
  defaults: WeekDefaults = {}
): ShipWeek | null {
  const raw = asRecord(rawValue)
  if (!raw) {
    return null
  }

  const baseProperties = getProperties(raw)
  const properties = mergeTopLevelProperties(baseProperties, raw, [
    'confidence',
    'has_plan',
    'has_retro',
    'issue_count',
    'owner_reports_to',
    'plan',
    'plan_approval',
    'program_accountable_id',
    'program_id',
    'program_name',
    'review_approval',
    'review_rating',
    'snapshot_taken_at',
    'sprint_number',
    'started_count',
    'submitted_at',
    'success_criteria',
    'workspace_sprint_start_date',
  ])
  const id = asString(raw.id)
  const title = asString(raw.title) ?? asString(raw.name)

  if (!id || !title) {
    return null
  }

  const sprintNumber = asNumber(raw.sprint_number) ?? asNumber(properties.sprint_number)
  const workspaceSprintStartDate = asString(raw.workspace_sprint_start_date)
    ?? asString(properties.workspace_sprint_start_date)
  const sprintDates = computeSprintDates(workspaceSprintStartDate, sprintNumber)
  const owner = asRecord(raw.owner)
  const ownerId = asString(raw.owner_id)
    ?? asString(owner?.id)
    ?? asString(properties.owner_id)
    ?? asStringArray(properties.assignee_ids)?.[0]
  const projectId = defaults.projectId
    ?? asString(raw.project_id)
    ?? asString(properties.project_id)
    ?? getAssociationId(raw, 'project')

  return {
    id,
    ownerId,
    projectId,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
    sprintEndDate: sprintDates.sprintEndDate,
    sprintStartDate: sprintDates.sprintStartDate,
    status: (asString(raw.status) ?? asString(properties.status) ?? 'planning') as ShipWeek['status'],
    title,
  }
}

export function normalizeShipWeekList(
  rawValues: unknown[],
  defaults: WeekDefaults = {}
): ShipWeek[] {
  return rawValues
    .map((value) => normalizeShipWeek(value, defaults))
    .filter((value): value is ShipWeek => value !== null)
}

export function normalizeShipProject(rawValue: unknown): ShipProject | null {
  const raw = asRecord(rawValue)
  if (!raw) {
    return null
  }

  const baseProperties = getProperties(raw)
  const properties = mergeTopLevelProperties(baseProperties, raw, [
    'accountable_id',
    'confidence',
    'ease',
    'has_retro',
    'impact',
    'inferred_status',
    'owner_id',
    'plan',
    'plan_approval',
    'retro_approval',
    'submitted_at',
    'target_date',
  ])
  const id = asString(raw.id)
  const title = asString(raw.title) ?? asString(raw.name)

  if (!id || !title) {
    return null
  }

  const owner = asRecord(raw.owner)

  return {
    accountableId: asString(raw.accountable_id) ?? asString(properties.accountable_id),
    id,
    ownerId: asString(raw.owner_id) ?? asString(owner?.id) ?? asString(properties.owner_id),
    properties: Object.keys(properties).length > 0 ? properties : undefined,
    status: asString(raw.inferred_status)
      ?? asString(raw.status)
      ?? asString(properties.inferred_status)
      ?? 'backlog',
    targetDate: asString(raw.target_date) ?? asString(properties.target_date),
    title,
  }
}

export function normalizeShipProjectList(rawValues: unknown[]): ShipProject[] {
  return rawValues
    .map((value) => normalizeShipProject(value))
    .filter((value): value is ShipProject => value !== null)
}
