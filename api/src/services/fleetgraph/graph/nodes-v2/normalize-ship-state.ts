/**
 * normalize_ship_state - Shared Pipeline
 *
 * Lane: Shared (convergence point for all three lanes)
 * Type: Deterministic transformation
 * LLM: No
 *
 * This is the critical normalization layer. Ship's relationship model is
 * mixed-shape - canonical document_associations coexist with legacy
 * properties.project_id and assignee_ids. This node collapses both into
 * one unified internal graph.
 *
 * Steps:
 * 1. Association normalization (document_associations + legacy fields)
 * 2. Person resolution (owner, accountable, assignee to person records)
 * 3. Temporal enrichment (days_until_target, hours_since_update, etc.)
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import type {
  EntityAdjacency,
  NormalizedEdge,
  NormalizedNode,
  NormalizedShipGraph,
  ShipIssue,
  ShipPerson,
  ShipProject,
  ShipWeek,
  TemporalEnrichment,
} from '../types-v2.js'
import { detectSuspectEntities } from '../suspect-detectors.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────────────

function hoursSince(dateString: string | undefined): number | undefined {
  if (!dateString) return undefined
  const then = new Date(dateString)
  if (isNaN(then.getTime())) return undefined
  const now = new Date()
  return (now.getTime() - then.getTime()) / (1000 * 60 * 60)
}

function daysUntil(dateString: string | undefined): number | undefined {
  if (!dateString) return undefined
  const target = new Date(dateString)
  if (isNaN(target.getTime())) return undefined
  const now = new Date()
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
}

function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

// ──────────────────────────────────────────────────────────────────────────────
// Normalization Functions
// ──────────────────────────────────────────────────────────────────────────────

function buildNodes(
  projects: ShipProject[],
  weeks: ShipWeek[],
  issues: ShipIssue[],
  people: ShipPerson[]
): NormalizedNode[] {
  const nodes: NormalizedNode[] = []

  for (const project of projects) {
    nodes.push({
      id: project.id,
      type: 'project',
      title: project.title,
      data: { ...project },
    })
  }

  for (const week of weeks) {
    nodes.push({
      id: week.id,
      type: 'week',
      title: week.title,
      data: { ...week },
    })
  }

  for (const issue of issues) {
    nodes.push({
      id: issue.id,
      type: 'issue',
      title: issue.title,
      data: { ...issue },
    })
  }

  for (const person of people) {
    nodes.push({
      id: person.id,
      type: 'person',
      title: person.name,
      data: { ...person },
    })
  }

  return nodes
}

function buildEdges(
  projects: ShipProject[],
  weeks: ShipWeek[],
  issues: ShipIssue[]
): NormalizedEdge[] {
  const edges: NormalizedEdge[] = []

  // Project relationships
  for (const project of projects) {
    if (project.ownerId) {
      edges.push({
        from: project.ownerId,
        to: project.id,
        type: 'owns',
      })
    }
    if (project.accountableId) {
      edges.push({
        from: project.accountableId,
        to: project.id,
        type: 'accountable_for',
      })
    }
  }

  // Week relationships
  for (const week of weeks) {
    if (week.ownerId) {
      edges.push({
        from: week.ownerId,
        to: week.id,
        type: 'owns',
      })
    }
    if (week.projectId) {
      edges.push({
        from: week.id,
        to: week.projectId,
        type: 'belongs_to_project',
      })
    }
  }

  // Issue relationships
  for (const issue of issues) {
    if (issue.assigneeId) {
      edges.push({
        from: issue.assigneeId,
        to: issue.id,
        type: 'assigned_to',
      })
    }
    if (issue.sprintId) {
      edges.push({
        from: issue.id,
        to: issue.sprintId,
        type: 'belongs_to_week',
      })
    }
    if (issue.projectId) {
      edges.push({
        from: issue.id,
        to: issue.projectId,
        type: 'belongs_to_project',
      })
    }
  }

  return edges
}

function buildAdjacency(
  projects: ShipProject[],
  weeks: ShipWeek[],
  issues: ShipIssue[]
): Record<string, EntityAdjacency> {
  const adjacency: Record<string, EntityAdjacency> = {}

  // Initialize all entities
  for (const project of projects) {
    adjacency[project.id] = {
      entityId: project.id,
      parents: [],
      children: [],
      assignees: [],
      owner: project.ownerId,
      accountable: project.accountableId,
    }
  }

  for (const week of weeks) {
    adjacency[week.id] = {
      entityId: week.id,
      parents: [],
      children: [],
      project: week.projectId,
      assignees: [],
      owner: week.ownerId,
    }

    // Add week as child of project
    if (week.projectId) {
      const projectAdj = adjacency[week.projectId]
      const weekAdj = adjacency[week.id]
      if (projectAdj && weekAdj) {
        projectAdj.children.push(week.id)
        weekAdj.parents.push(week.projectId)
      }
    }
  }

  for (const issue of issues) {
    adjacency[issue.id] = {
      entityId: issue.id,
      parents: [],
      children: [],
      project: issue.projectId,
      sprint: issue.sprintId,
      assignees: issue.assigneeId ? [issue.assigneeId] : [],
    }

    // Add issue as child of sprint
    if (issue.sprintId) {
      const sprintAdj = adjacency[issue.sprintId]
      const issueAdj = adjacency[issue.id]
      if (sprintAdj && issueAdj) {
        sprintAdj.children.push(issue.id)
        issueAdj.parents.push(issue.sprintId)
      }
    }
  }

  return adjacency
}

function buildTemporalEnrichment(
  projects: ShipProject[],
  issues: ShipIssue[],
  _workspaceTimezone = 'America/New_York'
): Record<string, TemporalEnrichment> {
  const temporal: Record<string, TemporalEnrichment> = {}
  const now = new Date()

  for (const project of projects) {
    temporal[project.id] = {
      daysUntilTargetDate: daysUntil(project.targetDate),
      isBusinessDay: isBusinessDay(now),
      workspaceTimezone: _workspaceTimezone,
    }
  }

  for (const issue of issues) {
    temporal[issue.id] = {
      hoursSinceLastUpdate: hoursSince(issue.lastUpdatedAt),
      isBusinessDay: isBusinessDay(now),
      workspaceTimezone: _workspaceTimezone,
    }
  }

  return temporal
}

function resolvePersons(
  people: ShipPerson[]
): Record<string, ShipPerson> {
  const resolved: Record<string, ShipPerson> = {}
  for (const person of people) {
    resolved[person.id] = person
  }
  return resolved
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes all raw Ship data into a unified graph representation.
 *
 * @param state - Current graph state with raw data
 * @returns State update with normalized context
 */
export function normalizeShipState(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  // Gather all entities from various sources
  const projects: ShipProject[] = [
    ...state.rawProjects,
    ...(state.rawProjectCluster ? [state.rawProjectCluster.project] : []),
  ]

  const weeks: ShipWeek[] = [
    ...state.rawWeeks,
    ...(state.rawWeekCluster ? [state.rawWeekCluster.week] : []),
    ...(state.rawProjectCluster?.weeks ?? []),
  ]

  const issues: ShipIssue[] = [
    ...state.rawIssues,
    ...(state.rawIssueCluster ? [state.rawIssueCluster.issue] : []),
    ...(state.rawIssueCluster?.children ?? []),
    ...(state.rawWeekCluster?.issues ?? []),
    ...(state.rawProjectCluster?.issues ?? []),
  ]

  const people: ShipPerson[] = [
    ...state.rawPeople,
    ...(state.rawIssueCluster?.relatedPeople ?? []),
    ...(state.rawWeekCluster?.relatedPeople ?? []),
    ...(state.rawProjectCluster?.relatedPeople ?? []),
    ...(state.rawProgramCluster?.relatedPeople ?? []),
  ]

  // Deduplicate by ID
  const uniqueProjects = Array.from(
    new Map(projects.map((p) => [p.id, p])).values()
  )
  const uniqueWeeks = Array.from(
    new Map(weeks.map((w) => [w.id, w])).values()
  )
  const uniqueIssues = Array.from(
    new Map(issues.map((i) => [i.id, i])).values()
  )
  const uniquePeople = Array.from(
    new Map(people.map((p) => [p.id, p])).values()
  )

  // Build normalized graph
  const normalizedContext: NormalizedShipGraph = {
    nodes: buildNodes(uniqueProjects, uniqueWeeks, uniqueIssues, uniquePeople),
    edges: buildEdges(uniqueProjects, uniqueWeeks, uniqueIssues),
    adjacency: buildAdjacency(uniqueProjects, uniqueWeeks, uniqueIssues),
    temporal: buildTemporalEnrichment(uniqueProjects, uniqueIssues),
    resolvedPersons: resolvePersons(uniquePeople),
  }

  const suspectEntities = state.suspectEntities.length > 0
    ? state.suspectEntities
    : detectSuspectEntities({
      issues: uniqueIssues,
      people: uniquePeople,
      projects: uniqueProjects,
      weeks: uniqueWeeks,
    })

  return {
    normalizedContext,
    suspectEntities,
    path: ['normalize_ship_state'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type NormalizeShipStateRoute = 'check_dedupe_cooldown'

/**
 * Always routes to check_dedupe_cooldown after normalization.
 */
export function routeFromNormalization(
  _state: FleetGraphStateV2
): NormalizeShipStateRoute {
  return 'check_dedupe_cooldown'
}
