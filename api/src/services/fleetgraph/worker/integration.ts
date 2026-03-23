import type { Pool } from 'pg'

import { pool as defaultPool } from '../../../db/client.js'
import { resolveFleetGraphWorkerSettings } from './config.js'
import { createFleetGraphDirtyContextHooks } from './hooks.js'
import { createFleetGraphWorkerStore } from './store.js'
import type {
  FleetGraphWorkerSettings,
  FleetGraphWorkerStore,
} from './types.js'

type Queryable = Pick<Pool, 'query'>

type DocumentMutationInput = {
  actorId?: string
  documentId: string
  documentType?: string
  routeSurface?: string
  workspaceId: string
}

type WorkspaceMutationInput = {
  actorId?: string
  routeSurface?: string
  workspaceId: string
}

interface FleetGraphWorkerIntegrationDeps {
  now?: () => Date
  queryable?: Queryable
  settings?: FleetGraphWorkerSettings
  store?: FleetGraphWorkerStore
}

export interface FleetGraphWorkspaceSweepBootstrapResult {
  registered: number
  workspaceIds: string[]
}

export function resolveFleetGraphDocumentRouteSurface(
  documentType?: string,
  fallback = 'document-write'
) {
  switch (documentType) {
    case 'issue':
      return 'issue-write'
    case 'project':
      return 'project-write'
    case 'sprint':
    case 'weekly_plan':
    case 'weekly_retro':
    case 'weekly_review':
      return 'week-write'
    default:
      return fallback
  }
}

export function createFleetGraphWorkerIntegration(
  deps: FleetGraphWorkerIntegrationDeps = {}
) {
  const now = deps.now ?? (() => new Date())
  const queryable = deps.queryable ?? defaultPool
  const settings = deps.settings ?? resolveFleetGraphWorkerSettings()
  const store = deps.store ?? createFleetGraphWorkerStore()
  const hooks = createFleetGraphDirtyContextHooks({
    now,
    settings,
    store,
  })

  return {
    ...hooks,

    registerWorkspaceSweep(workspaceId: string, nextSweepAt = now()) {
      return store.registerWorkspaceSweep(workspaceId, nextSweepAt)
    },

    async registerActiveWorkspaceSweeps(runAt = now()) {
      const result = await queryable.query(
        `SELECT id
         FROM workspaces
         WHERE archived_at IS NULL
         ORDER BY created_at ASC`
      ) as { rows: Array<{ id: string }> }

      const workspaceIds = result.rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)

      for (const workspaceId of workspaceIds) {
        await store.registerWorkspaceSweep(workspaceId, runAt)
      }

      return {
        registered: workspaceIds.length,
        workspaceIds,
      } satisfies FleetGraphWorkspaceSweepBootstrapResult
    },
  }
}

let cachedIntegration:
  | ReturnType<typeof createFleetGraphWorkerIntegration>
  | null = null

export function getFleetGraphWorkerIntegration() {
  cachedIntegration ??= createFleetGraphWorkerIntegration()
  return cachedIntegration
}

export function resetFleetGraphWorkerIntegrationForTests() {
  cachedIntegration = null
}

function logFleetGraphWorkerIntegrationError(
  action: string,
  details: Record<string, unknown>,
  error: unknown
) {
  console.error(`FleetGraph worker integration failed during ${action}`, {
    ...details,
    error: error instanceof Error ? error.message : String(error),
  })
}

export async function safelyEnqueueFleetGraphDocumentMutation(
  input: DocumentMutationInput
) {
  try {
    await getFleetGraphWorkerIntegration().enqueueDocumentMutation({
      ...input,
      routeSurface:
        input.routeSurface
        ?? resolveFleetGraphDocumentRouteSurface(input.documentType),
    })
  } catch (error) {
    logFleetGraphWorkerIntegrationError('document enqueue', input, error)
  }
}

export async function safelyEnqueueFleetGraphWorkspaceMutation(
  input: WorkspaceMutationInput
) {
  try {
    await getFleetGraphWorkerIntegration().enqueueWorkspaceMutation(input)
  } catch (error) {
    logFleetGraphWorkerIntegrationError('workspace enqueue', input, error)
  }
}

export async function safelyRegisterFleetGraphWorkspaceSweep(
  workspaceId: string
) {
  try {
    await getFleetGraphWorkerIntegration().registerWorkspaceSweep(workspaceId)
  } catch (error) {
    logFleetGraphWorkerIntegrationError(
      'workspace sweep registration',
      { workspaceId },
      error
    )
  }
}
