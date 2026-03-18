import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { loadProductionSecrets } from '../../../config/ssm.js'
import { assertFleetGraphSurfaceReadiness, isFleetGraphV2Enabled } from '../deployment/index.js'
import { createFleetGraphProactiveRuntime, resolveFleetGraphShipApiConfig } from '../proactive/index.js'
import { createFleetGraphV2Runtime } from '../graph/runtime-v2.js'
import type { ParallelFetchConfig } from '../proactive/parallel-fetch.js'
import { resolveFleetGraphWorkerSettings } from './config.js'
import { createFleetGraphWorkerStore } from './store.js'
import { createFleetGraphWorkerRuntime } from './runtime.js'
import type { FleetGraphState, FleetGraphOutcome } from '../graph/types.js'

/**
 * Creates a runtime adapter that wraps V2 runtime to match the worker's expected interface.
 * Maps V1-style input to V2 input format and adapts return types.
 */
function createV2RuntimeAdapter() {
  // Build ParallelFetchConfig from environment
  const apiConfig = resolveFleetGraphShipApiConfig()
  const fetchConfig: ParallelFetchConfig = {
    baseUrl: apiConfig.baseUrl,
    token: apiConfig.token,
  }

  const v2Runtime = createFleetGraphV2Runtime({ fetchConfig })

  return {
    async invoke(input: unknown): Promise<FleetGraphState> {
      const v1Input = input as {
        contextKind: 'entry' | 'proactive'
        documentId?: string
        mode: 'proactive' | 'on_demand'
        routeSurface?: string
        threadId: string
        trigger: string
        workspaceId: string
      }

      // Map V1 trigger to V2 triggerType and mode
      const triggerType = v1Input.trigger === 'scheduled-sweep' ? 'sweep' as const
        : v1Input.trigger === 'event' ? 'enqueue' as const
        : 'user_chat' as const

      // Map V1 mode to V2 mode
      const mode = v1Input.mode === 'proactive' ? 'proactive' as const
        : triggerType === 'enqueue' ? 'event_driven' as const
        : 'on_demand' as const

      const v2State = await v2Runtime.invoke({
        // Entry context
        mode,
        triggerType,
        triggerSource: v1Input.routeSurface ?? 'worker',
        workspaceId: v1Input.workspaceId,
        actorId: null,
        viewerUserId: null,

        // Surface context
        documentId: v1Input.documentId ?? null,
        documentType: null,
        activeTab: null,
        nestedPath: null,
        projectContextId: null,
        userQuestion: null,

        // Event context
        dirtyEntityId: null,
        dirtyEntityType: null,
        dirtyWriteType: null,
        dirtyCoalescedIds: [],

        // Thread management
        threadId: v1Input.threadId,
      })

      // Map V2 branch to V1 outcome
      // V2: 'quiet' | 'advisory' | 'action_required' | 'fallback'
      // V1: 'quiet' | 'advisory' | 'approval_required' | 'fallback'
      const mapBranchToOutcome = (branch: string): FleetGraphOutcome => {
        if (branch === 'action_required') return 'approval_required'
        if (branch === 'quiet' || branch === 'advisory' || branch === 'fallback') {
          return branch as FleetGraphOutcome
        }
        return 'quiet'
      }

      // Map V2 branch to V1 branch
      // V2: 'quiet' | 'advisory' | 'action_required' | 'fallback'
      // V1: 'quiet' | 'reasoned' | 'approval_required' | 'fallback'
      const mapBranch = (branch: string): FleetGraphState['branch'] => {
        if (branch === 'action_required') return 'approval_required'
        if (branch === 'advisory') return 'reasoned'
        if (branch === 'quiet' || branch === 'fallback') {
          return branch as FleetGraphState['branch']
        }
        return 'quiet'
      }

      const v2Branch = v2State.branch ?? 'quiet'

      // Adapt V2 state to V1 state format for compatibility
      // Only the fields actually used by the worker store are required:
      // - outcome: used in completeJob SQL
      // - branch/path: used by checkpointSummary fallback
      return {
        approvalRequired: v2Branch === 'action_required',
        branch: mapBranch(v2Branch),
        candidateCount: v2State.scoredFindings?.length ?? 0,
        checkpointNamespace: 'fleetgraph' as const,
        contextKind: v1Input.contextKind,
        hasError: v2State.partialData || (v2State.fetchErrors?.length ?? 0) > 0,
        mode: v1Input.mode,
        outcome: mapBranchToOutcome(v2Branch),
        path: v2State.path ?? [],
        routeSurface: v1Input.routeSurface ?? 'worker',
        scenarioResults: [],
        threadId: v1Input.threadId,
        trigger: v1Input.trigger as FleetGraphState['trigger'],
        workspaceId: v1Input.workspaceId,
      }
    },

    async getState(threadId: string): Promise<unknown> {
      const result = await v2Runtime.getState(threadId)
      return result.values
    },
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    await loadProductionSecrets()
    assertFleetGraphSurfaceReadiness('worker')
  }

  const healthServer = startWorkerHealthServer()
  const useV2 = isFleetGraphV2Enabled()

  console.log(`FleetGraph worker starting with ${useV2 ? 'V2' : 'V1'} runtime`)

  const settings = resolveFleetGraphWorkerSettings()
  const runtime = useV2 ? createV2RuntimeAdapter() : createFleetGraphProactiveRuntime()

  const worker = createFleetGraphWorkerRuntime({
    runtime,
    settings,
    store: createFleetGraphWorkerStore(),
  })

  while (true) {
    const result = await worker.pollOnce()
    const idle = result.job.status === 'idle' && result.sweep.enqueued === 0
    await delay(idle ? settings.pollIntervalMs : 250)
  }

  await healthServer?.close()
}

main().catch((error) => {
  console.error('FleetGraph worker failed:', error)
  process.exit(1)
})

function startWorkerHealthServer() {
  const port = Number.parseInt(process.env.PORT ?? '', 10)
  if (!Number.isFinite(port) || port <= 0) {
    return null
  }

  const server = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ role: 'worker', status: 'ok' }))
      return
    }

    response.writeHead(404, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: 'Not found' }))
  })

  server.listen(port, () => {
    console.log(`FleetGraph worker health server listening on ${port}`)
  })

  return server
}
