/**
 * Singleton factory for FleetGraph worker hooks.
 *
 * Use this from API routes to enqueue events for background processing.
 * The hooks are lazily initialized on first use.
 */

import { isSurfaceEnabled } from '../deployment/config.js'
import { createFleetGraphDirtyContextHooks } from './hooks.js'
import { resolveFleetGraphWorkerSettings } from './config.js'
import { createFleetGraphWorkerStore } from './store.js'
import type { FleetGraphEnqueueResult } from './types.js'

let hooksInstance: ReturnType<typeof createFleetGraphDirtyContextHooks> | null = null

function getHooks() {
  if (!hooksInstance) {
    const settings = resolveFleetGraphWorkerSettings()
    const store = createFleetGraphWorkerStore()
    hooksInstance = createFleetGraphDirtyContextHooks({ settings, store })
  }
  return hooksInstance
}

/**
 * Enqueue a document mutation for background FleetGraph processing.
 *
 * Call this after successful mutations in routes (issues, weeks, etc.)
 * The event will be debounced and processed by the worker.
 *
 * Returns silently if FleetGraph worker is disabled.
 */
export async function enqueueFleetGraphEvent(input: {
  actorId?: string
  documentId: string
  documentType?: string
  routeSurface?: string
  workspaceId: string
}): Promise<FleetGraphEnqueueResult | null> {
  // Skip if worker is not enabled
  if (!isSurfaceEnabled('worker')) {
    return null
  }

  try {
    return await getHooks().enqueueDocumentMutation(input)
  } catch (error) {
    // Log but don't fail the request - event enqueue is non-critical
    console.error('[FleetGraph] Failed to enqueue event:', error)
    return null
  }
}

/**
 * Enqueue a workspace-level mutation for background FleetGraph processing.
 */
export async function enqueueFleetGraphWorkspaceEvent(input: {
  actorId?: string
  routeSurface?: string
  workspaceId: string
}): Promise<FleetGraphEnqueueResult | null> {
  if (!isSurfaceEnabled('worker')) {
    return null
  }

  try {
    return await getHooks().enqueueWorkspaceMutation(input)
  } catch (error) {
    console.error('[FleetGraph] Failed to enqueue workspace event:', error)
    return null
  }
}
