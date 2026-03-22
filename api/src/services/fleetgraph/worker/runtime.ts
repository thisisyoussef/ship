import {
  buildFleetGraphDedupeKey,
  buildFleetGraphThreadId,
} from './keys.js'
import { createFleetGraphDirtyContextHooks } from './hooks.js'
import type {
  FleetGraphRunNextResult,
  FleetGraphSweepResult,
  FleetGraphWorkerRuntimeDeps,
} from './types.js'

function runtimeInputFromJob(job: {
  documentId?: string
  mode: 'proactive' | 'on_demand'
  routeSurface?: string
  threadId: string
  trigger: 'document-context' | 'event' | 'scheduled-sweep' | 'human-review'
  workspaceId: string
}) {
  return {
    contextKind: job.mode === 'on_demand' ? 'entry' as const : 'proactive' as const,
    documentId: job.documentId,
    mode: job.mode,
    routeSurface: job.routeSurface,
    threadId: job.threadId,
    trigger: job.trigger,
    workspaceId: job.workspaceId,
  }
}

function cooldownForTrigger(
  trigger: 'document-context' | 'event' | 'scheduled-sweep' | 'human-review',
  deps: FleetGraphWorkerRuntimeDeps
) {
  return trigger === 'scheduled-sweep'
    ? deps.settings.sweepIntervalMs
    : deps.settings.eventDebounceMs
}

async function safeGetState(
  runtime: FleetGraphWorkerRuntimeDeps['runtime'],
  threadId: string
) {
  try {
    return await runtime.getState(threadId)
  } catch {
    return null
  }
}

export function createFleetGraphWorkerRuntime(
  deps: FleetGraphWorkerRuntimeDeps
) {
  const now = deps.now ?? (() => new Date())
  const hooks = createFleetGraphDirtyContextHooks(deps)

  return {
    ...hooks,

    registerWorkspaceSweep(workspaceId: string, nextSweepAt = now()) {
      return deps.store.registerWorkspaceSweep(workspaceId, nextSweepAt)
    },

    async runDueSweeps(runAt = now()): Promise<FleetGraphSweepResult> {
      const claimed = await deps.store.claimDueSweepSchedules(
        runAt,
        deps.settings.sweepBatchSize,
        deps.settings.sweepIntervalMs
      )

      const summary: FleetGraphSweepResult = {
        blocked: 0,
        claimed: claimed.length,
        deduped: 0,
        enqueued: 0,
      }

      for (const sweep of claimed) {
        const result = await deps.store.enqueue(
          {
            dedupeKey: buildFleetGraphDedupeKey({
              mode: 'proactive',
              routeSurface: 'workspace-sweep',
              trigger: 'scheduled-sweep',
              workspaceId: sweep.workspaceId,
            }),
            mode: 'proactive',
            routeSurface: 'workspace-sweep',
            threadId: buildFleetGraphThreadId({
              trigger: 'scheduled-sweep',
              workspaceId: sweep.workspaceId,
            }),
            trigger: 'scheduled-sweep',
            workspaceId: sweep.workspaceId,
          },
          runAt,
          deps.settings.maxAttempts
        )

        if (result.status === 'enqueued') {
          summary.enqueued += 1
        } else if (result.status === 'deduped') {
          summary.deduped += 1
        } else {
          summary.blocked += 1
          if (result.ledger.nextEligibleAt) {
            await deps.store.registerWorkspaceSweep(
              sweep.workspaceId,
              result.ledger.nextEligibleAt
            )
          }
        }
      }

      return summary
    },

    async runNext(runAt = now()): Promise<FleetGraphRunNextResult> {
      const job = await deps.store.claimNextJob(runAt)
      if (!job) {
        return { job: null, status: 'idle' }
      }

      try {
        const state = await deps.runtime.invoke(runtimeInputFromJob(job))
        const checkpoint = await safeGetState(deps.runtime, job.threadId)
        const updatedJob = await deps.store.completeJob(
          job.id,
          state,
          checkpoint,
          runAt,
          cooldownForTrigger(job.trigger, deps)
        )

        return {
          job: updatedJob,
          state,
          status: 'completed',
        }
      } catch (error) {
        console.error('FleetGraph worker job failed', {
          error: error instanceof Error ? error.message : String(error),
          jobId: job.id,
          threadId: job.threadId,
          workspaceId: job.workspaceId,
        })
        const checkpoint = await safeGetState(deps.runtime, job.threadId)
        const updatedJob = await deps.store.failJob(
          job.id,
          error instanceof Error ? error.message : String(error),
          checkpoint,
          runAt,
          deps.settings.retryDelayMs
        )

        return {
          job: updatedJob,
          status: updatedJob.status === 'queued' ? 'requeued' : 'failed',
        }
      }
    },

    async pollOnce(runAt = now()) {
      const sweep = await this.runDueSweeps(runAt)
      const job = await this.runNext(runAt)
      return { job, sweep }
    },
  }
}
