/**
 * route_by_surface - On-Demand Lane
 *
 * Lane: On-Demand
 * Type: Deterministic router
 * LLM: No
 *
 * Resolves one or more cluster fetch targets from the current document surface
 * plus any associated Ship relationships already present on the primary
 * document payload.
 */

import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'
import type { FleetGraphSurfaceTarget } from '../types-v2.js'

export type RouteBySurfaceTarget = FleetGraphSurfaceTarget | 'fallback_input'

interface SurfaceAssociation {
  id: string
  type: string
}

const ISSUE_TO_WEEK_TERMS = ['sprint', 'week', 'standup', 'review', 'retro', 'plan']
const ISSUE_TO_PROJECT_TERMS = ['project', 'deadline', 'target', 'roadmap', 'owner', 'workload']
const WEEK_TO_PROJECT_TERMS = ['project', 'deadline', 'target', 'roadmap']
const PROJECT_TO_PROGRAM_TERMS = ['program', 'portfolio', 'director']

function readAssociations(state: FleetGraphStateV2): SurfaceAssociation[] {
  if (!Array.isArray(state.rawPrimaryDocument?.belongs_to)) {
    return []
  }

  return state.rawPrimaryDocument.belongs_to.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return []
    }

    const id = typeof (entry as { id?: unknown }).id === 'string'
      ? (entry as { id: string }).id
      : ''
    const type = typeof (entry as { type?: unknown }).type === 'string'
      ? (entry as { type: string }).type.toLowerCase()
      : ''

    return id && type ? [{ id, type }] : []
  })
}

function firstAssociationId(
  associations: SurfaceAssociation[],
  types: string[]
): string | null {
  return associations.find((association) => types.includes(association.type))?.id ?? null
}

function mentionsAny(question: string | null, terms: string[]) {
  if (!question) {
    return false
  }

  const normalized = question.toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

function pushTarget(targets: RouteBySurfaceTarget[], target: RouteBySurfaceTarget) {
  if (!targets.includes(target)) {
    targets.push(target)
  }
}

export function routeBySurface(
  state: FleetGraphStateV2
): FleetGraphStateV2Update {
  const docType = state.documentType ?? state.rawPrimaryDocument?.documentType
  const normalizedType = docType?.toLowerCase().replace(/_/g, '-')
  const associations = readAssociations(state)
  const surfaceTargets: FleetGraphSurfaceTarget[] = []

  const associatedIssueId = firstAssociationId(associations, ['issue', 'parent'])
  const associatedWeekId = firstAssociationId(associations, ['sprint', 'week'])
  const associatedProjectId = firstAssociationId(associations, ['project'])
  const associatedProgramId = firstAssociationId(associations, ['program'])
  const primaryDocumentId = state.documentId ?? state.rawPrimaryDocument?.id ?? null

  let surfaceIssueId: string | null = null
  let surfaceWeekId: string | null = null
  let surfaceProjectId: string | null = state.projectContextId ?? null
  let surfaceProgramId: string | null = null

  switch (normalizedType) {
    case 'issue':
      surfaceIssueId = primaryDocumentId
      pushTarget(surfaceTargets, 'fetch_issue_cluster')
      if (associatedWeekId && mentionsAny(state.userQuestion, ISSUE_TO_WEEK_TERMS)) {
        surfaceWeekId = associatedWeekId
        pushTarget(surfaceTargets, 'fetch_week_cluster')
      }
      if ((associatedProjectId ?? surfaceProjectId) && mentionsAny(state.userQuestion, ISSUE_TO_PROJECT_TERMS)) {
        surfaceProjectId = associatedProjectId ?? surfaceProjectId
        pushTarget(surfaceTargets, 'fetch_project_cluster')
      }
      break

    case 'sprint':
    case 'week':
      surfaceWeekId = primaryDocumentId
      pushTarget(surfaceTargets, 'fetch_week_cluster')
      if ((associatedProjectId ?? surfaceProjectId) && mentionsAny(state.userQuestion, WEEK_TO_PROJECT_TERMS)) {
        surfaceProjectId = associatedProjectId ?? surfaceProjectId
        pushTarget(surfaceTargets, 'fetch_project_cluster')
      }
      break

    case 'project':
      surfaceProjectId = primaryDocumentId
      pushTarget(surfaceTargets, 'fetch_project_cluster')
      if (associatedProgramId && mentionsAny(state.userQuestion, PROJECT_TO_PROGRAM_TERMS)) {
        surfaceProgramId = associatedProgramId
        pushTarget(surfaceTargets, 'fetch_program_cluster')
      }
      break

    case 'program':
      surfaceProgramId = primaryDocumentId
      pushTarget(surfaceTargets, 'fetch_program_cluster')
      break

    case 'weekly-plan':
    case 'weekly-retro':
    case 'weeklyplan':
    case 'weeklyretro':
      surfaceWeekId = associatedWeekId
      if (surfaceWeekId) {
        pushTarget(surfaceTargets, 'fetch_week_cluster')
      }
      surfaceProjectId = associatedProjectId ?? surfaceProjectId
      if (surfaceProjectId) {
        pushTarget(surfaceTargets, 'fetch_project_cluster')
      }
      if (associatedProgramId && mentionsAny(state.userQuestion, PROJECT_TO_PROGRAM_TERMS)) {
        surfaceProgramId = associatedProgramId
        pushTarget(surfaceTargets, 'fetch_program_cluster')
      }
      break

    case 'wiki':
    case 'person':
    case 'standup':
      if (associatedIssueId) {
        surfaceIssueId = associatedIssueId
        pushTarget(surfaceTargets, 'fetch_issue_cluster')
      }
      if (associatedWeekId) {
        surfaceWeekId = associatedWeekId
        pushTarget(surfaceTargets, 'fetch_week_cluster')
      }
      if (associatedProjectId ?? surfaceProjectId) {
        surfaceProjectId = associatedProjectId ?? surfaceProjectId
        pushTarget(surfaceTargets, 'fetch_project_cluster')
      }
      if (associatedProgramId) {
        surfaceProgramId = associatedProgramId
        pushTarget(surfaceTargets, 'fetch_program_cluster')
      }
      break
  }

  if (surfaceTargets.length === 0) {
    return {
      branch: 'fallback',
      fallbackReason: 'FleetGraph could not determine which Ship surface to analyze from this document.',
      fallbackStage: 'input',
      path: ['route_by_surface'],
      surfaceTargets: [],
      surfaceIssueId,
      surfaceWeekId,
      surfaceProjectId,
      surfaceProgramId,
    }
  }

  return {
    path: ['route_by_surface'],
    surfaceTargets,
    surfaceIssueId,
    surfaceWeekId,
    surfaceProjectId,
    surfaceProgramId,
  }
}

export function routeFromSurface(
  state: FleetGraphStateV2
): RouteBySurfaceTarget | RouteBySurfaceTarget[] {
  if (state.branch === 'fallback' || state.surfaceTargets.length === 0) {
    return 'fallback_input'
  }

  return state.surfaceTargets.length === 1
    ? state.surfaceTargets[0]!
    : state.surfaceTargets
}
