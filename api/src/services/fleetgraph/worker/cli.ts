import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { loadProductionSecrets } from '../../../config/ssm.js'
import { assertFleetGraphSurfaceReadiness } from '../deployment/index.js'
import { createFleetGraphProactiveRuntime } from '../proactive/index.js'
import { resolveFleetGraphWorkerSettings } from './config.js'
import { createFleetGraphWorkerStore } from './store.js'
import { createFleetGraphWorkerRuntime } from './runtime.js'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    await loadProductionSecrets()
    assertFleetGraphSurfaceReadiness('worker')
  }

  const healthServer = startWorkerHealthServer()

  const settings = resolveFleetGraphWorkerSettings()
  const worker = createFleetGraphWorkerRuntime({
    runtime: createFleetGraphProactiveRuntime(),
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
