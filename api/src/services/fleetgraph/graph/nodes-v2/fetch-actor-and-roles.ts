/**
 * fetch_actor_and_roles - On-Demand Lane
 *
 * Lane: On-Demand
 * Type: REST fetch + deterministic derivation
 * LLM: No
 *
 * Fetches actor information and derives the role lens for reasoning.
 *
 * Role derivation stack (evaluated top to bottom, first match wins):
 * 1. Explicit person role == "Director" → director
 * 2. Accountable across ≥ 2 projects/programs OR workspace admin → director
 * 3. Person role == "PM" OR owns weeks/projects → pm
 * 4. Default: primarily owns issues and submits standups → engineer
 * 5. Cannot determine → unknown
 *
 * See docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md for full specification.
 */

import {
  fetchActorAndRoles,
  type ParallelFetchConfig,
} from '../../proactive/parallel-fetch.js'
import type {
  ActorProfile,
  FleetGraphV2RoleLens,
  RoleSignal,
  ShipPerson,
  ShipProject,
  ShipWeek,
} from '../types-v2.js'
import type { FleetGraphStateV2, FleetGraphStateV2Update } from '../state-v2.js'

// ──────────────────────────────────────────────────────────────────────────────
// Dependencies
// ──────────────────────────────────────────────────────────────────────────────

export interface FetchActorAndRolesDeps {
  config: ParallelFetchConfig
}

// ──────────────────────────────────────────────────────────────────────────────
// Role Derivation
// ──────────────────────────────────────────────────────────────────────────────

interface RoleDerivationResult {
  roleLens: FleetGraphV2RoleLens
  derivationStack: RoleSignal[]
}

function deriveRoleLens(
  person: ShipPerson | null,
  isAdmin: boolean,
  people: ShipPerson[],
  projects: ShipProject[],
  weeks: ShipWeek[]
): RoleDerivationResult {
  const derivationStack: RoleSignal[] = []

  if (!person) {
    return {
      roleLens: 'unknown',
      derivationStack: [{
        priority: 5,
        signal: 'No person record found',
        source: 'auth',
        lens: 'unknown',
      }],
    }
  }

  // Priority 1: Explicit Director role
  if (person.role?.toLowerCase() === 'director') {
    derivationStack.push({
      priority: 1,
      signal: 'Explicit role: Director',
      source: 'functional',
      lens: 'director',
    })
    return { roleLens: 'director', derivationStack }
  }

  // Priority 2: Accountable across ≥ 2 projects/programs OR workspace admin
  const accountableProjects = projects.filter(
    (p) => p.accountableId === person.id
  )
  if (accountableProjects.length >= 2 || isAdmin) {
    derivationStack.push({
      priority: 2,
      signal: isAdmin
        ? 'Workspace admin with multi-project visibility'
        : `Accountable for ${accountableProjects.length} projects`,
      source: 'raci',
      lens: 'director',
    })
    return { roleLens: 'director', derivationStack }
  }

  // Priority 3: PM role or owns weeks/projects
  if (person.role?.toLowerCase() === 'pm') {
    derivationStack.push({
      priority: 3,
      signal: 'Explicit role: PM',
      source: 'functional',
      lens: 'pm',
    })
    return { roleLens: 'pm', derivationStack }
  }

  const ownsWeeks = weeks.filter((w) => w.ownerId === person.id)
  const ownsProjects = projects.filter((p) => p.ownerId === person.id)
  if (ownsWeeks.length > 0 || ownsProjects.length > 0) {
    derivationStack.push({
      priority: 3,
      signal: `Owns ${ownsWeeks.length} weeks and ${ownsProjects.length} projects`,
      source: 'functional',
      lens: 'pm',
    })
    return { roleLens: 'pm', derivationStack }
  }

  // Priority 4: Default to engineer
  derivationStack.push({
    priority: 4,
    signal: 'Default: issue assignee / standup submitter',
    source: 'functional',
    lens: 'engineer',
  })
  return { roleLens: 'engineer', derivationStack }
}

// ──────────────────────────────────────────────────────────────────────────────
// Node Implementation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches actor information and derives their role lens.
 *
 * @param state - Current graph state with actor ID
 * @param deps - Dependencies including fetch config
 * @returns State update with actor profile and role lens
 */
export async function fetchActorAndRolesNode(
  state: FleetGraphStateV2,
  deps: FetchActorAndRolesDeps
): Promise<FleetGraphStateV2Update> {
  if (!state.actorId) {
    return {
      actorProfile: null,
      roleLens: 'unknown',
      roleDerivationStack: [{
        priority: 5,
        signal: 'No actor ID provided',
        source: 'auth',
        lens: 'unknown',
      }],
      path: ['fetch_actor_and_roles'],
    }
  }

  const result = await fetchActorAndRoles(state.actorId, deps.config)

  // Build actor profile
  const actorProfile: ActorProfile | null = result.actorPerson
    ? {
        id: result.actorPerson.id,
        name: result.actorPerson.name,
        email: result.actorPerson.email,
        role: result.actorPerson.role,
        isAdmin: result.isAdmin,
        projectMemberships: [], // Would need additional fetch
        programMemberships: [], // Would need additional fetch
      }
    : null

  // Derive role lens
  // Note: We need projects/weeks for full role derivation, but we may not have them yet
  // For on-demand, we'll use a simplified derivation and enhance later
  const roleResult = deriveRoleLens(
    result.actorPerson,
    result.isAdmin,
    result.people,
    [], // Projects not fetched yet in on-demand
    []  // Weeks not fetched yet in on-demand
  )

  return {
    actorProfile,
    roleLens: roleResult.roleLens,
    roleDerivationStack: roleResult.derivationStack,
    rawPeople: result.people,
    fetchErrors: result.errors,
    partialData: result.errors.length > 0,
    path: ['fetch_actor_and_roles'],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routing Function
// ──────────────────────────────────────────────────────────────────────────────

export type FetchActorAndRolesRoute = 'fetch_primary_document'

/**
 * Always routes to fetch_primary_document after actor fetch.
 */
export function routeFromActorAndRoles(
  _state: FleetGraphStateV2
): FetchActorAndRolesRoute {
  return 'fetch_primary_document'
}
