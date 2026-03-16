import {
  buildFleetGraphDedupeKey,
  buildFleetGraphThreadId,
} from './keys.js'
import type {
  FleetGraphEnqueueResult,
  FleetGraphWorkerSettings,
  FleetGraphWorkerStore,
} from './types.js'

interface FleetGraphDirtyContextHooksDeps {
  now?: () => Date
  settings: FleetGraphWorkerSettings
  store: FleetGraphWorkerStore
}

export function createFleetGraphDirtyContextHooks(
  deps: FleetGraphDirtyContextHooksDeps
) {
  const now = deps.now ?? (() => new Date())

  return {
    enqueueDocumentMutation(input: {
      actorId?: string
      documentId: string
      documentType?: string
      routeSurface?: string
      workspaceId: string
    }): Promise<FleetGraphEnqueueResult> {
      const runAt = now()
      return deps.store.enqueue(
        {
          actorId: input.actorId,
          availableAt: new Date(
            runAt.getTime() + deps.settings.eventDebounceMs
          ),
          dedupeKey: buildFleetGraphDedupeKey({
            documentId: input.documentId,
            mode: 'proactive',
            routeSurface: input.routeSurface ?? 'background-event',
            trigger: 'event',
            workspaceId: input.workspaceId,
          }),
          documentId: input.documentId,
          documentType: input.documentType,
          mode: 'proactive',
          routeSurface: input.routeSurface ?? 'background-event',
          threadId: buildFleetGraphThreadId({
            documentId: input.documentId,
            trigger: 'event',
            workspaceId: input.workspaceId,
          }),
          trigger: 'event',
          workspaceId: input.workspaceId,
        },
        runAt,
        deps.settings.maxAttempts
      )
    },

    enqueueWorkspaceMutation(input: {
      actorId?: string
      routeSurface?: string
      workspaceId: string
    }): Promise<FleetGraphEnqueueResult> {
      const runAt = now()
      return deps.store.enqueue(
        {
          actorId: input.actorId,
          availableAt: new Date(
            runAt.getTime() + deps.settings.eventDebounceMs
          ),
          dedupeKey: buildFleetGraphDedupeKey({
            mode: 'proactive',
            routeSurface: input.routeSurface ?? 'background-event',
            trigger: 'event',
            workspaceId: input.workspaceId,
          }),
          mode: 'proactive',
          routeSurface: input.routeSurface ?? 'background-event',
          threadId: buildFleetGraphThreadId({
            trigger: 'event',
            workspaceId: input.workspaceId,
          }),
          trigger: 'event',
          workspaceId: input.workspaceId,
        },
        runAt,
        deps.settings.maxAttempts
      )
    },
  }
}
