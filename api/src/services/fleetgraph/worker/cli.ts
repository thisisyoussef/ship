import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { loadProductionSecrets } from '../../../config/ssm.js'
import {
  createFleetGraphFindingActionStore,
} from '../actions/index.js'
import { assertFleetGraphSurfaceReadiness } from '../deployment/index.js'
import {
  createFleetGraphFindingStore,
} from '../findings/index.js'
import { createFleetGraphV2Runtime } from '../graph/runtime-v2.js'
import { createLLMAdapter, resolveLLMConfig } from '../llm/index.js'
import { resolveFleetGraphShipApiConfig } from '../proactive/index.js'
import type { ParallelFetchConfig } from '../proactive/parallel-fetch.js'
import { resolveFleetGraphWorkerSettings } from './config.js'
import { createFleetGraphWorkerRuntime } from './runtime.js'
import { createFleetGraphWorkerStore } from './store.js'

function createV2Runtime() {
  const apiConfig = resolveFleetGraphShipApiConfig()
  const fetchConfig: ParallelFetchConfig = {
    baseUrl: apiConfig.baseUrl,
    token: apiConfig.token,
  }

  let llm
  try {
    const llmConfig = resolveLLMConfig(process.env)
    llm = llmConfig ? createLLMAdapter(llmConfig) : undefined
  } catch {
    llm = undefined
  }

  return createFleetGraphV2Runtime({
    actionStore: createFleetGraphFindingActionStore(),
    fetchConfig,
    findingStore: createFleetGraphFindingStore(),
    llm,
  })
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    await loadProductionSecrets()
    assertFleetGraphSurfaceReadiness('worker')
  }

  const healthServer = startWorkerHealthServer()
  console.log('FleetGraph worker starting with native V2 runtime')

  const settings = resolveFleetGraphWorkerSettings()
  const store = createFleetGraphWorkerStore()
  const worker = createFleetGraphWorkerRuntime({
    runtime: createV2Runtime(),
    settings,
    store,
  })

  // On boot: register all active workspaces for sweeping so findings
  // are generated immediately after deployment, not only after events.
  try {
    const { pool } = await import('../../../db/client.js')
    const result = await pool.query(
      'SELECT id FROM workspaces WHERE archived_at IS NULL'
    )
    const now = new Date()
    let registered = 0
    for (const row of result.rows as Array<{ id: string }>) {
      try {
        await store.registerWorkspaceSweep(row.id, now)
        registered++
      } catch {
        // Already registered or table missing
      }
    }
    console.log(`FleetGraph worker boot: registered ${registered} workspace(s) for immediate sweep`)
  } catch (err) {
    console.warn('FleetGraph worker boot sweep registration skipped:', (err as Error).message)
  }

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
