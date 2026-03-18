/**
 * FleetGraph V2 Runtime - Three-Lane Architecture
 *
 * This file composes all 25 nodes into a StateGraph with the edge table
 * defined in docs/specs/fleetgraph/THREE_LANE_ARCHITECTURE.md
 *
 * Three lanes:
 * 1. Proactive Sweep Lane - background worker detects drift, risk, accountability gaps
 * 2. On-Demand Context Lane - user opens a page and asks a question
 * 3. Event-Driven Enqueue Lane - Ship write triggers targeted re-evaluation
 *
 * All lanes converge at normalize_ship_state → score → branch → deliver
 */

import { END, START, StateGraph } from '@langchain/langgraph'
import { MemorySaver } from '@langchain/langgraph'

import type { ParallelFetchConfig } from '../proactive/parallel-fetch.js'
import { FleetGraphStateV2Annotation, type FleetGraphStateV2 } from './state-v2.js'
import type { FleetGraphV2RuntimeInput } from './types-v2.js'

// Import all nodes
import {
  resolveTriggerContext,
  routeFromTriggerContext,
} from './nodes-v2/resolve-trigger-context.js'
import {
  fetchWorkspaceSnapshotNode,
  routeFromWorkspaceSnapshot,
} from './nodes-v2/fetch-workspace-snapshot.js'
import {
  identifyDirtyEntities,
  routeFromDirtyEntities,
} from './nodes-v2/identify-dirty-entities.js'
import {
  expandSuspects,
  routeFromExpandSuspects,
} from './nodes-v2/expand-suspects.js'
import {
  fetchActorAndRolesNode,
  routeFromActorAndRoles,
} from './nodes-v2/fetch-actor-and-roles.js'
import {
  fetchPrimaryDocumentNode,
  routeFromPrimaryDocument,
} from './nodes-v2/fetch-primary-document.js'
import {
  routeBySurface,
  routeFromSurface,
} from './nodes-v2/route-by-surface.js'
import {
  fetchIssueClusterNode,
  routeFromIssueCluster,
} from './nodes-v2/fetch-issue-cluster.js'
import {
  fetchWeekClusterNode,
  routeFromWeekCluster,
} from './nodes-v2/fetch-week-cluster.js'
import {
  fetchProjectClusterNode,
  routeFromProjectCluster,
} from './nodes-v2/fetch-project-cluster.js'
import {
  fetchProgramClusterNode,
  routeFromProgramCluster,
} from './nodes-v2/fetch-program-cluster.js'
import {
  fetchDirtyContextNode,
  routeFromDirtyContext,
} from './nodes-v2/fetch-dirty-context.js'
import {
  expandAffectedClusterNode,
  routeFromAffectedCluster,
} from './nodes-v2/expand-affected-cluster.js'
import {
  normalizeShipState,
  routeFromNormalization,
} from './nodes-v2/normalize-ship-state.js'
import {
  checkDedupeCooldown,
  routeFromDedupeCooldown,
} from './nodes-v2/check-dedupe-cooldown.js'
import {
  scoreCandidates,
  routeFromScoreCandidates,
} from './nodes-v2/score-candidates.js'
import {
  quietExit,
  routeFromQuietExit,
} from './nodes-v2/quiet-exit.js'
import {
  reasonFindings,
  routeFromReasonFindings,
} from './nodes-v2/reason-findings.js'
import {
  policyGate,
  routeFromPolicyGate,
} from './nodes-v2/policy-gate.js'
import {
  emitAdvisory,
  routeFromEmitAdvisory,
} from './nodes-v2/emit-advisory.js'
import {
  approvalInterrupt,
  routeFromApprovalInterrupt,
} from './nodes-v2/approval-interrupt.js'
import {
  executeConfirmedAction,
  routeFromExecuteConfirmedAction,
} from './nodes-v2/execute-confirmed-action.js'
import {
  persistActionOutcome,
} from './nodes-v2/persist-action-outcome.js'
import {
  persistRunState,
} from './nodes-v2/persist-run-state.js'
import {
  fallback,
  routeFromFallback,
} from './nodes-v2/fallback.js'

// ──────────────────────────────────────────────────────────────────────────────
// Runtime Configuration
// ──────────────────────────────────────────────────────────────────────────────

export interface FleetGraphV2RuntimeConfig {
  fetchConfig: ParallelFetchConfig
  checkpointer?: MemorySaver
}

// ──────────────────────────────────────────────────────────────────────────────
// Graph Builder
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates the FleetGraph V2 StateGraph with all nodes and edges.
 */
export function createFleetGraphV2Graph(config: FleetGraphV2RuntimeConfig) {
  const builder = new StateGraph(FleetGraphStateV2Annotation)

  // ────────────────────────────────────────────────────────────────────────────
  // Add Nodes
  // ────────────────────────────────────────────────────────────────────────────

  // Entry node
  builder.addNode('resolve_trigger_context', resolveTriggerContext)

  // Proactive lane nodes
  builder.addNode('fetch_workspace_snapshot', (state: FleetGraphStateV2) =>
    fetchWorkspaceSnapshotNode(state, { config: config.fetchConfig })
  )
  builder.addNode('identify_dirty_entities', identifyDirtyEntities)
  builder.addNode('expand_suspects', (state: FleetGraphStateV2) =>
    expandSuspects(state, { config: config.fetchConfig })
  )

  // On-demand lane nodes
  builder.addNode('fetch_actor_and_roles', (state: FleetGraphStateV2) =>
    fetchActorAndRolesNode(state, { config: config.fetchConfig })
  )
  builder.addNode('fetch_primary_document', (state: FleetGraphStateV2) =>
    fetchPrimaryDocumentNode(state, { config: config.fetchConfig })
  )
  builder.addNode('route_by_surface', routeBySurface)
  builder.addNode('fetch_issue_cluster', (state: FleetGraphStateV2) =>
    fetchIssueClusterNode(state, { config: config.fetchConfig })
  )
  builder.addNode('fetch_week_cluster', (state: FleetGraphStateV2) =>
    fetchWeekClusterNode(state, { config: config.fetchConfig })
  )
  builder.addNode('fetch_project_cluster', (state: FleetGraphStateV2) =>
    fetchProjectClusterNode(state, { config: config.fetchConfig })
  )
  builder.addNode('fetch_program_cluster', (state: FleetGraphStateV2) =>
    fetchProgramClusterNode(state, { config: config.fetchConfig })
  )

  // Event-driven lane nodes
  builder.addNode('fetch_dirty_context', (state: FleetGraphStateV2) =>
    fetchDirtyContextNode(state, { config: config.fetchConfig })
  )
  builder.addNode('expand_affected_cluster', (state: FleetGraphStateV2) =>
    expandAffectedClusterNode(state, { config: config.fetchConfig })
  )

  // Shared pipeline nodes
  builder.addNode('normalize_ship_state', normalizeShipState)
  builder.addNode('check_dedupe_cooldown', (state: FleetGraphStateV2) =>
    checkDedupeCooldown(state)
  )
  builder.addNode('score_candidates', scoreCandidates)
  builder.addNode('quiet_exit', quietExit)
  builder.addNode('reason_findings', (state: FleetGraphStateV2) =>
    reasonFindings(state)
  )
  builder.addNode('policy_gate', policyGate)
  builder.addNode('emit_advisory', emitAdvisory)
  builder.addNode('approval_interrupt', approvalInterrupt)
  builder.addNode('execute_confirmed_action', (state: FleetGraphStateV2) =>
    executeConfirmedAction(state, { config: config.fetchConfig })
  )
  builder.addNode('persist_action_outcome', (state: FleetGraphStateV2) =>
    persistActionOutcome(state)
  )
  builder.addNode('persist_run_state', (state: FleetGraphStateV2) =>
    persistRunState(state)
  )
  builder.addNode('fallback', fallback)

  // ────────────────────────────────────────────────────────────────────────────
  // Add Edges
  // Note: Type assertions needed because TypeScript can't infer node names from
  // dynamic addNode calls. This is a common pattern with LangGraph.js.
  // ────────────────────────────────────────────────────────────────────────────

  // Use any-typed builder for edge definitions (LangGraph typing limitation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph = builder as any

  // Entry edge
  graph.addEdge(START, 'resolve_trigger_context')

  // Edge 1-4: resolve_trigger_context routing
  graph.addConditionalEdges('resolve_trigger_context', routeFromTriggerContext, {
    fetch_workspace_snapshot: 'fetch_workspace_snapshot',
    fetch_actor_and_roles: 'fetch_actor_and_roles',
    fetch_dirty_context: 'fetch_dirty_context',
    fallback: 'fallback',
  })

  // Edge 5-6: fetch_workspace_snapshot routing
  graph.addConditionalEdges('fetch_workspace_snapshot', routeFromWorkspaceSnapshot, {
    identify_dirty_entities: 'identify_dirty_entities',
    fallback: 'fallback',
  })

  // Edge 7-8: identify_dirty_entities routing
  graph.addConditionalEdges('identify_dirty_entities', routeFromDirtyEntities, {
    expand_suspects: 'expand_suspects',
    normalize_ship_state: 'normalize_ship_state',
  })

  // Edge 9: expand_suspects → normalize_ship_state
  graph.addEdge('expand_suspects', 'normalize_ship_state')

  // Edge 10: fetch_actor_and_roles → fetch_primary_document
  graph.addEdge('fetch_actor_and_roles', 'fetch_primary_document')

  // Edge 11: fetch_primary_document routing
  graph.addConditionalEdges('fetch_primary_document', routeFromPrimaryDocument, {
    route_by_surface: 'route_by_surface',
    fallback: 'fallback',
  })

  // Edge 12-16: route_by_surface routing
  graph.addConditionalEdges('route_by_surface', (state: FleetGraphStateV2) => {
    const route = routeFromSurface(state)
    // Handle both single route and array of routes
    return Array.isArray(route) ? route[0] : route
  }, {
    fetch_issue_cluster: 'fetch_issue_cluster',
    fetch_week_cluster: 'fetch_week_cluster',
    fetch_project_cluster: 'fetch_project_cluster',
    fetch_program_cluster: 'fetch_program_cluster',
    fallback: 'fallback',
  })

  // Edge 17-20: cluster fetches → normalize_ship_state
  graph.addEdge('fetch_issue_cluster', 'normalize_ship_state')
  graph.addEdge('fetch_week_cluster', 'normalize_ship_state')
  graph.addEdge('fetch_project_cluster', 'normalize_ship_state')
  graph.addEdge('fetch_program_cluster', 'normalize_ship_state')

  // Edge 21: fetch_dirty_context routing
  graph.addConditionalEdges('fetch_dirty_context', routeFromDirtyContext, {
    expand_affected_cluster: 'expand_affected_cluster',
    fallback: 'fallback',
  })

  // Edge 22: expand_affected_cluster → normalize_ship_state
  graph.addEdge('expand_affected_cluster', 'normalize_ship_state')

  // Edge 23: normalize_ship_state → check_dedupe_cooldown
  graph.addEdge('normalize_ship_state', 'check_dedupe_cooldown')

  // Edge 24: check_dedupe_cooldown → score_candidates
  graph.addEdge('check_dedupe_cooldown', 'score_candidates')

  // Edge 25-27: score_candidates routing
  graph.addConditionalEdges('score_candidates', routeFromScoreCandidates, {
    quiet_exit: 'quiet_exit',
    reason_findings: 'reason_findings',
    fallback: 'fallback',
  })

  // Edge 28: quiet_exit → persist_run_state
  graph.addEdge('quiet_exit', 'persist_run_state')

  // Edge 29: reason_findings → policy_gate
  graph.addEdge('reason_findings', 'policy_gate')

  // Edge 30-31: policy_gate routing
  graph.addConditionalEdges('policy_gate', routeFromPolicyGate, {
    emit_advisory: 'emit_advisory',
    approval_interrupt: 'approval_interrupt',
  })

  // Edge 32: emit_advisory → persist_run_state
  graph.addEdge('emit_advisory', 'persist_run_state')

  // Edge 33-34: approval_interrupt routing
  graph.addConditionalEdges('approval_interrupt', routeFromApprovalInterrupt, {
    execute_confirmed_action: 'execute_confirmed_action',
    persist_action_outcome: 'persist_action_outcome',
  })

  // Edge 35: execute_confirmed_action → persist_action_outcome
  graph.addEdge('execute_confirmed_action', 'persist_action_outcome')

  // Edge 36: persist_run_state → END
  graph.addEdge('persist_run_state', END)

  // Edge 37: persist_action_outcome → END
  graph.addEdge('persist_action_outcome', END)

  // Edge 38: fallback → persist_run_state
  graph.addEdge('fallback', 'persist_run_state')

  return builder
}

// ──────────────────────────────────────────────────────────────────────────────
// Runtime Factory
// ──────────────────────────────────────────────────────────────────────────────

export interface FleetGraphV2Runtime {
  invoke(
    input: FleetGraphV2RuntimeInput,
    options?: { threadId?: string }
  ): Promise<FleetGraphStateV2>

  getState(threadId: string): Promise<{ values: FleetGraphStateV2 }>

  resume(
    threadId: string,
    decision: 'approved' | 'dismissed' | 'snoozed'
  ): Promise<FleetGraphStateV2>
}

/**
 * Creates the FleetGraph V2 runtime with checkpointing support.
 */
export function createFleetGraphV2Runtime(
  config: FleetGraphV2RuntimeConfig
): FleetGraphV2Runtime {
  const checkpointer = config.checkpointer ?? new MemorySaver()
  const graph = createFleetGraphV2Graph(config).compile({ checkpointer })

  return {
    async invoke(input, options = {}) {
      const threadId = options.threadId ?? input.threadId

      const result = await graph.invoke(
        {
          workspaceId: input.workspaceId,
          threadId,
          triggerType: input.triggerType,
          triggerSource: input.triggerSource,
          actorId: input.actorId,
          viewerUserId: input.viewerUserId,
          documentId: input.documentId,
          documentType: input.documentType,
          activeTab: input.activeTab,
          nestedPath: input.nestedPath,
          projectContextId: input.projectContextId,
          userQuestion: input.userQuestion,
          dirtyEntityId: input.dirtyEntityId,
          dirtyEntityType: input.dirtyEntityType,
          dirtyWriteType: input.dirtyWriteType,
          dirtyCoalescedIds: input.dirtyCoalescedIds,
        },
        { configurable: { thread_id: threadId } }
      )

      return result as FleetGraphStateV2
    },

    async getState(threadId) {
      const snapshot = await graph.getState({ configurable: { thread_id: threadId } })
      return { values: snapshot.values as FleetGraphStateV2 }
    },

    async resume(threadId, decision) {
      // Update the graph state with the approval decision
      await graph.updateState(
        { configurable: { thread_id: threadId } },
        { approvalDecision: decision }
      )

      // Resume execution
      const result = await graph.invoke(
        null,
        { configurable: { thread_id: threadId } }
      )

      return result as FleetGraphStateV2
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────────────────────

export type {
  FleetGraphStateV2,
  FleetGraphV2RuntimeInput,
}
