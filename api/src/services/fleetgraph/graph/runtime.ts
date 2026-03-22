import { Command, END, START, StateGraph, Send, getConfig, interrupt, task } from '@langchain/langgraph'
import type { BaseCheckpointSaver, StateSnapshot } from '@langchain/langgraph'

import {
  buildShipActionSuccessMessage,
  defaultShipRestExecutor,
  isAlreadyActiveResult,
  readShipActionMessage,
  type ShipRestExecutor,
  type ShipRestRequestContext,
} from '../actions/executor.js'
import {
  createFleetGraphFindingActionStore,
  type FleetGraphFindingActionStore,
} from '../actions/index.js'
import {
  createFleetGraphFindingStore,
  FLEETGRAPH_FINDING_TYPES,
  type FleetGraphFindingStore,
} from '../findings/index.js'
import {
  createLLMAdapter,
  resolveLLMConfig,
  type LLMAdapter,
} from '../llm/index.js'
import {
  createFleetGraphShipApiClient,
  resolveFleetGraphShipApiConfig,
} from '../proactive/ship-client.js'
import type { FleetGraphShipApiClient } from '../proactive/types.js'
import {
  createLangSmithClient,
  createTracedLLMAdapter,
  resolveFleetGraphTracingSettings,
  type FleetGraphTracingSettings,
  type LangSmithClientLike,
} from '../tracing/index.js'
import { createFleetGraphCheckpointer } from './checkpointer.js'
import { runFindingActionReviewScenario } from './finding-action-review.js'
import { createFetchDeepNode } from './nodes/fetch-deep.js'
import { createFetchMediumNode } from './nodes/fetch-medium.js'
import { createReasonNode } from './nodes/reason.js'
import { runOnDemandAnalysisScenario } from './on-demand-analysis.js'
import { runOnDemandEntryScenario } from './on-demand-entry.js'
import { createSprintNoOwnerScenarioRunner } from './proactive-sprint-no-owner.js'
import { createUnassignedIssuesScenarioRunner } from './proactive-unassigned-issues.js'
import { createWeekStartDriftScenarioRunner } from './proactive-week-start.js'
import { FleetGraphStateAnnotation } from './state.js'
import {
  FleetGraphStateSchema,
  parseFleetGraphRuntimeInput,
  type FleetGraphContextEnvelope,
  type FleetGraphRuntimeInput,
  type FleetGraphScenario,
  type FleetGraphScenarioResult,
  type FleetGraphState,
} from './types.js'

interface FleetGraphRuntimeDeps {
  actionStore?: FleetGraphFindingActionStore
  checkpointer?: BaseCheckpointSaver
  executeShipRestAction?: ShipRestExecutor
  findingStore?: FleetGraphFindingStore
  llmAdapter?: LLMAdapter
  now?: () => Date
  shipClient?: FleetGraphShipApiClient
  tracingClient?: LangSmithClientLike
  tracingSettings?: FleetGraphTracingSettings
}

interface FleetGraphRuntimeInternals {
  checkpointer: BaseCheckpointSaver
  ensureReady: () => Promise<void>
  graph: {
    getState(config: ReturnType<typeof buildConfig>): Promise<StateSnapshot>
    getStateHistory(config: ReturnType<typeof buildConfig>): AsyncIterable<StateSnapshot>
    invoke(input: unknown, config: ReturnType<typeof buildConfig>): Promise<unknown>
  }
  kind: string
}

export interface FleetGraphInterruptSummary {
  id?: string
  taskName: string
  value?: unknown
}

export interface FleetGraphRuntime {
  readonly checkpointer: BaseCheckpointSaver
  readonly checkpointerKind: string
  getCheckpointHistory(threadId: string): Promise<StateSnapshot[]>
  getPendingInterrupts(threadId: string): Promise<FleetGraphInterruptSummary[]>
  getState(threadId: string): Promise<StateSnapshot>
  invoke(input: unknown, configurable?: Record<string, unknown>): Promise<FleetGraphState>
  invokeRaw(input: unknown, configurable?: Record<string, unknown>): Promise<StateSnapshot>
  resume(
    threadId: string,
    value: unknown,
    configurable?: Record<string, unknown>
  ): Promise<FleetGraphState>
}

function branchOutcome(branch: FleetGraphScenarioResult['branch']) {
  switch (branch) {
    case 'approval_required':
      return 'approval_required' as const
    case 'fallback':
      return 'fallback' as const
    case 'reasoned':
      return 'advisory' as const
    default:
      return 'quiet' as const
  }
}

function buildRouteSurface(input: FleetGraphRuntimeInput) {
  if (input.routeSurface) {
    return input.routeSurface
  }

  return input.mode === 'on_demand'
    ? 'document-page'
    : 'workspace-sweep'
}

function buildConfig(threadId: string, configurable: Record<string, unknown> = {}) {
  return {
    configurable: {
      thread_id: threadId,
      ...configurable,
    },
  }
}

function parseState(snapshot: StateSnapshot) {
  return FleetGraphStateSchema.parse(snapshot.values) as FleetGraphState
}

function selectScenarios(state: FleetGraphState) {
  switch (state.contextKind) {
    case 'entry':
      if (state.mode === 'on_demand' && !state.requestedAction) {
        return ['on_demand_analysis'] satisfies FleetGraphScenario[]
      }
      return [
        state.requestedAction ? 'entry_requested_action' : 'entry_context_check',
      ] satisfies FleetGraphScenario[]
    case 'finding_review':
      return ['finding_action_review'] satisfies FleetGraphScenario[]
    default:
      return ['week_start_drift', 'sprint_no_owner', 'unassigned_sprint_issues'] satisfies FleetGraphScenario[]
  }
}

function buildReviewPayload(state: {
  selectedAction?: FleetGraphState['selectedAction']
  selectedFindingId?: string
}) {
  return {
    evidence: state.selectedAction?.evidence ?? [],
    findingId: state.selectedFindingId,
    summary: state.selectedAction?.summary,
    title: state.selectedAction?.title,
    type: state.selectedAction?.type,
  }
}

function buildGenericActionSuccessMessage(
  action: FleetGraphState['selectedAction']
) {
  switch (action?.type) {
    case 'approve_project_plan':
      return 'Project plan approved in Ship.'
    case 'approve_week_plan':
      return 'Week plan approved in Ship. This page should now show the week plan as approved.'
    case 'post_comment':
      return 'Comment posted in Ship.'
    case 'assign_owner':
      return 'Owner updated in Ship.'
    case 'assign_issues':
      return 'Assignments updated in Ship.'
    default:
      return 'FleetGraph completed the requested action in Ship.'
  }
}

function buildGenericActionFailureFallback(
  action: FleetGraphState['selectedAction']
) {
  switch (action?.type) {
    case 'approve_project_plan':
      return 'Ship could not approve the project plan.'
    case 'approve_week_plan':
      return 'Ship could not approve the week plan.'
    case 'post_comment':
      return 'Ship could not post the comment.'
    case 'assign_owner':
      return 'Ship could not update the owner.'
    case 'assign_issues':
      return 'Ship could not update the assignments.'
    default:
      return 'Ship could not apply the requested FleetGraph action.'
  }
}

function createFleetGraphRuntimeInternals(
  deps: FleetGraphRuntimeDeps = {},
  env: NodeJS.ProcessEnv = process.env
): FleetGraphRuntimeInternals {
  const findingStore = deps.findingStore ?? createFleetGraphFindingStore()
  const actionStore = deps.actionStore ?? createFleetGraphFindingActionStore()
  const shipClient = deps.shipClient
    ?? createFleetGraphShipApiClient(resolveFleetGraphShipApiConfig(env))
  const tracingSettings = deps.tracingSettings
    ?? resolveFleetGraphTracingSettings(env)
  const tracingClient = deps.tracingClient
    ?? createLangSmithClient(tracingSettings)
  const llmAdapter = deps.llmAdapter
    ?? createTracedLLMAdapter(createLLMAdapter(resolveLLMConfig(env)), {
      client: tracingClient,
      settings: tracingSettings,
    })
  const now = deps.now ?? (() => new Date())
  const { checkpointer, ensureReady, kind } = createFleetGraphCheckpointer({
    checkpointer: deps.checkpointer,
  })
  const runWeekStartDriftScenario = createWeekStartDriftScenarioRunner({
    findings: findingStore,
    llmAdapter,
    now,
    shipClient,
    tracingClient,
    tracingSettings,
  })
  const runSprintNoOwnerScenario = createSprintNoOwnerScenarioRunner({
    findings: findingStore,
    llmAdapter,
    now,
    shipClient,
    tracingClient,
    tracingSettings,
  })
  const runUnassignedIssuesScenario = createUnassignedIssuesScenarioRunner({
    findings: findingStore,
    llmAdapter,
    now,
    shipClient,
    tracingClient,
    tracingSettings,
  })
  const fetchMediumNode = createFetchMediumNode({ shipClient })
  const reasonNode = createReasonNode({ llm: llmAdapter })
  const fetchDeepNode = createFetchDeepNode({ shipClient })
  const upsertFindingTask = task(
    'fleetgraph.findings.upsert',
    async (input: {
      documentId: string
      documentType: string
      evidence: string[]
      findingKey: string
      findingType: (typeof FLEETGRAPH_FINDING_TYPES)[number]
      metadata: Record<string, unknown>
      nowIso: string
      recommendedAction?: FleetGraphState['selectedAction']
      summary: string
      threadId: string
      title: string
      tracePublicUrl?: string
      traceRunId?: string
      workspaceId: string
    }) => findingStore.upsertFinding({
      dedupeKey: input.findingKey,
      documentId: input.documentId,
      documentType: input.documentType,
      evidence: input.evidence,
      findingKey: input.findingKey,
      findingType: input.findingType,
      metadata: input.metadata,
      recommendedAction: input.recommendedAction,
      summary: input.summary,
      threadId: input.threadId,
      title: input.title,
      tracePublicUrl: input.tracePublicUrl,
      traceRunId: input.traceRunId,
      workspaceId: input.workspaceId,
    }, new Date(input.nowIso))
  )
  const beginExecutionTask = task(
    'fleetgraph.action.begin_execution',
    async (input: {
      endpoint: { method: 'POST' | 'PATCH'; path: string }
      findingId: string
      workspaceId: string
      nowIso: string
    }) => actionStore.beginStartWeekExecution({
      endpoint: input.endpoint,
      findingId: input.findingId,
      workspaceId: input.workspaceId,
    }, new Date(input.nowIso))
  )
  const finishExecutionTask = task(
    'fleetgraph.action.finish_execution',
    async (input: {
      appliedAt?: string
      endpoint: { method: 'POST' | 'PATCH'; path: string }
      findingId: string
      message: string
      resultStatusCode?: number
      status: 'applied' | 'already_applied' | 'failed'
      workspaceId: string
      nowIso: string
    }) => actionStore.finishStartWeekExecution({
      appliedAt: input.appliedAt ? new Date(input.appliedAt) : undefined,
      endpoint: input.endpoint,
      findingId: input.findingId,
      message: input.message,
      resultStatusCode: input.resultStatusCode,
      status: input.status,
      workspaceId: input.workspaceId,
    }, new Date(input.nowIso))
  )
  const executeShipRestActionTask = task(
    'fleetgraph.action.execute_ship_rest',
    async (input: { method: string; path: string; requestContext: ShipRestRequestContext }) =>
      (deps.executeShipRestAction ?? defaultShipRestExecutor)(input.path, input.requestContext, input.method)
  )

  const graph = new StateGraph(FleetGraphStateAnnotation)
    .addNode('resolve_trigger_context', (state) => {
      const context: FleetGraphContextEnvelope | undefined =
        state.mode === 'on_demand' && state.documentId && state.documentType
          ? {
              actorId: '',
              documentId: state.documentId,
              documentTitle: state.documentTitle ?? '',
              documentType: state.documentType,
              surface: state.routeSurface || 'document-page',
              workspaceId: state.workspaceId,
            }
          : undefined

      return {
        checkpointNamespace: 'fleetgraph',
        context,
        path: 'resolve_trigger_context',
        routeSurface: state.routeSurface || 'workspace-sweep',
      }
    })
    .addNode('select_scenarios', () => ({
      path: 'select_scenarios',
    }))
    .addNode('run_scenario', async (state) => {
      const result = state.activeScenario === 'week_start_drift'
        ? await runWeekStartDriftScenario(state as FleetGraphRuntimeInput)
        : state.activeScenario === 'sprint_no_owner'
          ? await runSprintNoOwnerScenario(state as FleetGraphRuntimeInput)
          : state.activeScenario === 'unassigned_sprint_issues'
            ? await runUnassignedIssuesScenario(state as FleetGraphRuntimeInput)
            : state.activeScenario === 'finding_action_review'
              ? runFindingActionReviewScenario(state as FleetGraphRuntimeInput)
              : state.activeScenario === 'on_demand_analysis'
                ? runOnDemandAnalysisScenario(state as FleetGraphRuntimeInput)
                : runOnDemandEntryScenario(state as FleetGraphRuntimeInput)

      return {
        path: `run_scenario:${result.scenario}`,
        scenarioResults: [result],
      }
    })
    .addNode('merge_candidates', (state) => ({
      candidateCount: state.scenarioResults.filter((result) => result.score > 0).length,
      path: 'merge_candidates',
    }))
    .addNode('score_and_rank', (state) => {
      const best = [...state.scenarioResults]
        .sort((left, right) => right.score - left.score)[0]

      if (!best || best.score <= 0) {
        return new Command({
          goto: 'quiet_exit',
          update: {
            branch: 'quiet',
            outcome: 'quiet',
            path: 'score_and_rank',
            selectedAction: undefined,
            selectedFindingId: undefined,
            selectedScenario: undefined,
          },
        })
      }

      return new Command({
        goto: best.branch === 'approval_required'
          ? 'approval_interrupt'
          : best.branch === 'reasoned'
            ? (best.scenario === 'on_demand_analysis' ? 'fetch_medium' : 'reason_and_deliver')
            : best.branch === 'fallback'
              ? 'fallback'
              : 'quiet_exit',
        update: {
          branch: best.branch,
          outcome: branchOutcome(best.branch),
          path: 'score_and_rank',
          selectedAction: best.recommendedAction,
          selectedFindingId: best.findingId,
          selectedScenario: best.scenario,
        },
      })
    }, {
      ends: ['approval_interrupt', 'fallback', 'fetch_medium', 'quiet_exit', 'reason_and_deliver'],
    })
    .addNode('fetch_medium', fetchMediumNode)
    .addNode('reason', reasonNode)
    .addNode('fetch_deep', fetchDeepNode)
    .addNode('quiet_exit', () => ({ path: 'quiet_exit' }))
    .addNode('reason_and_deliver', () => ({ path: 'reason_and_deliver' }))
    .addNode('approval_interrupt', async (state) => {
      if (!state.selectedAction) {
        return new Command({
          goto: 'fallback',
          update: { path: 'approval_interrupt' },
        })
      }

      const decision = await interrupt(buildReviewPayload(state))
      if (decision === 'approved') {
        return new Command({
          goto: 'execute_action',
          update: { path: 'approval_interrupt' },
        })
      }

      return new Command({
        goto: 'persist_action_outcome',
        update: {
          actionOutcome: {
            message: 'No change was applied in Ship.',
            status: 'dismissed',
          },
          path: 'approval_interrupt',
        },
      })
    }, {
      ends: ['execute_action', 'fallback', 'persist_action_outcome'],
    })
    .addNode('execute_action', async (state) => {
      if (!state.selectedAction) {
        return {
          actionOutcome: {
            message: 'FleetGraph could not resolve the requested Ship action.',
            status: 'failed',
          },
          path: 'execute_action',
        }
      }

      const config = getConfig()
      const requestContext = config?.configurable?.fleetgraphActionRequestContext as
        | ShipRestRequestContext
        | undefined
      const actionMethod = state.selectedAction.endpoint.method
      const endpoint = {
        method: actionMethod === 'PATCH' ? 'PATCH' as const : 'POST' as const,
        path: state.selectedAction.endpoint.path,
      }
      if (!requestContext) {
        return {
          actionOutcome: {
            message: 'FleetGraph could not resolve the current Ship request context.',
            status: 'failed',
          },
          path: 'execute_action',
        }
      }

      if (!state.selectedFindingId) {
        const result = await executeShipRestActionTask({
          method: actionMethod,
          path: endpoint.path,
          requestContext,
        })

        return {
          actionOutcome: result.ok
            ? {
              message: buildGenericActionSuccessMessage(state.selectedAction),
              resultStatusCode: result.status,
              status: 'applied',
            }
            : {
              message: readShipActionMessage(
                result.body,
                buildGenericActionFailureFallback(state.selectedAction)
              ),
              resultStatusCode: result.status,
              status: 'failed',
            },
          path: 'execute_action',
        }
      }

      const started = await beginExecutionTask({
        endpoint,
        findingId: state.selectedFindingId,
        nowIso: now().toISOString(),
        workspaceId: state.workspaceId,
      })
      if (!started.shouldExecute) {
        return {
          actionOutcome: {
            message: started.execution.message,
            resultStatusCode: started.execution.resultStatusCode,
            status: started.execution.status,
          },
          path: 'execute_action',
        }
      }

      const result = await executeShipRestActionTask({
        method: actionMethod,
        path: endpoint.path,
        requestContext,
      })
      const execution = result.ok
        ? await finishExecutionTask({
          appliedAt: now().toISOString(),
          endpoint,
          findingId: state.selectedFindingId,
          message: buildShipActionSuccessMessage(result.body),
          nowIso: now().toISOString(),
          resultStatusCode: result.status,
          status: 'applied',
          workspaceId: state.workspaceId,
        })
        : isAlreadyActiveResult(result)
          ? await finishExecutionTask({
            endpoint,
            findingId: state.selectedFindingId,
            message: 'Week was already active when this FleetGraph action was applied.',
            nowIso: now().toISOString(),
            resultStatusCode: result.status,
            status: 'already_applied',
            workspaceId: state.workspaceId,
          })
          : await finishExecutionTask({
            endpoint,
            findingId: state.selectedFindingId,
            message: readShipActionMessage(result.body, 'Ship could not apply the week-start action.'),
            nowIso: now().toISOString(),
            resultStatusCode: result.status,
            status: 'failed',
            workspaceId: state.workspaceId,
          })

      return {
        actionOutcome: {
          message: execution.message,
          resultStatusCode: execution.resultStatusCode,
          status: execution.status,
        },
        path: 'execute_action',
      }
    })
    .addNode('persist_action_outcome', () => ({
      path: 'persist_action_outcome',
    }))
    .addNode('persist_result', async (state) => {
      const selected = state.scenarioResults.find((result) => result.scenario === state.selectedScenario)
      const findingType = FLEETGRAPH_FINDING_TYPES.includes(
        selected?.scenario as (typeof FLEETGRAPH_FINDING_TYPES)[number]
      )
        ? selected?.scenario as (typeof FLEETGRAPH_FINDING_TYPES)[number]
        : null
      if (
        !selected?.findingKey
        || !selected.documentId
        || !selected.documentType
        || !selected.summary
        || !selected.title
        || !findingType
      ) {
        // No-op for scenarios that don't produce a persistable finding (e.g. on_demand_analysis
        // quiet path, or any scenario without a findingKey/summary/title). Safe to skip.
        return { path: 'persist_result' }
      }

      await upsertFindingTask({
        documentId: selected.documentId,
        documentType: selected.documentType,
        evidence: selected.evidence,
        findingKey: selected.findingKey,
        findingType,
        metadata: selected.metadata,
        nowIso: now().toISOString(),
        recommendedAction: selected.recommendedAction,
        summary: selected.summary,
        threadId: state.threadId,
        title: selected.title,
        tracePublicUrl: selected.tracePublicUrl,
        traceRunId: selected.traceRunId,
        workspaceId: state.workspaceId,
      })

      return { path: 'persist_result' }
    })
    .addNode('fallback', () => ({ path: 'fallback' }))
    .addEdge(START, 'resolve_trigger_context')
    .addEdge('resolve_trigger_context', 'select_scenarios')
    .addConditionalEdges('select_scenarios', (state) => {
      const scenarios = selectScenarios(state as FleetGraphState)
      return scenarios.map((scenario) => new Send('run_scenario', { ...state, activeScenario: scenario }))
    })
    .addEdge('run_scenario', 'merge_candidates')
    .addEdge('merge_candidates', 'score_and_rank')
    .addEdge('fetch_medium', 'reason')
    .addConditionalEdges('reason', (state) =>
      state.needsDeeperContext ? 'fetch_deep' : 'persist_result'
    , { fetch_deep: 'fetch_deep', persist_result: 'persist_result' })
    .addEdge('fetch_deep', 'reason')
    .addEdge('quiet_exit', 'persist_result')
    .addEdge('reason_and_deliver', 'persist_result')
    .addEdge('persist_result', END)
    .addEdge('persist_action_outcome', END)
    .addEdge('execute_action', 'persist_action_outcome')
    .addEdge('fallback', END)
    .compile({
      checkpointer,
      name: 'fleetgraph.runtime',
    })

  return {
    checkpointer,
    ensureReady,
    graph,
    kind,
  }
}

export function createFleetGraphStudioGraph(
  deps: FleetGraphRuntimeDeps = {},
  env: NodeJS.ProcessEnv = process.env
) {
  return createFleetGraphRuntimeInternals(deps, env).graph
}

export function createFleetGraphRuntime(
  deps: FleetGraphRuntimeDeps = {},
  env: NodeJS.ProcessEnv = process.env
): FleetGraphRuntime {
  const {
    checkpointer,
    ensureReady,
    graph,
    kind,
  } = createFleetGraphRuntimeInternals(deps, env)

  return {
    checkpointer,
    checkpointerKind: kind,
    async getCheckpointHistory(threadId: string) {
      await ensureReady()
      const history: StateSnapshot[] = []
      for await (const snapshot of graph.getStateHistory(buildConfig(threadId))) {
        history.push(snapshot)
      }
      return history
    },
    async getPendingInterrupts(threadId: string) {
      const snapshot = await this.getState(threadId)
      return snapshot.tasks.flatMap((taskState) =>
        taskState.interrupts.map((item) => ({
          id: item.id,
          taskName: taskState.name,
          value: item.value,
        }))
      )
    },
    async getState(threadId: string) {
      await ensureReady()
      return graph.getState(buildConfig(threadId))
    },
    async invoke(input: unknown, configurable = {}) {
      const snapshot = await this.invokeRaw(input, configurable)
      return parseState(snapshot)
    },
    async invokeRaw(input: unknown, configurable = {}) {
      await ensureReady()
      const parsed = parseFleetGraphRuntimeInput(input)
      await graph.invoke({
        ...parsed,
        routeSurface: buildRouteSurface(parsed),
        scenarioResults: [],
      }, buildConfig(parsed.threadId, configurable))
      return graph.getState(buildConfig(parsed.threadId, configurable))
    },
    async resume(threadId: string, value: unknown, configurable = {}) {
      await ensureReady()
      await graph.invoke(new Command({ resume: value }), buildConfig(threadId, configurable))
      const snapshot = await graph.getState(buildConfig(threadId, configurable))
      return parseState(snapshot)
    },
  }
}
