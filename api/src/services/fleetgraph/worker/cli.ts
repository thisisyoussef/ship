import { setTimeout as delay } from 'node:timers/promises'

import { createFleetGraphRuntime } from '../graph/index.js'
import { resolveFleetGraphWorkerSettings } from './config.js'
import { createFleetGraphWorkerStore } from './store.js'
import { createFleetGraphWorkerRuntime } from './runtime.js'

async function main() {
  const settings = resolveFleetGraphWorkerSettings()
  const worker = createFleetGraphWorkerRuntime({
    runtime: createFleetGraphRuntime(),
    settings,
    store: createFleetGraphWorkerStore(),
  })

  while (true) {
    const result = await worker.pollOnce()
    const idle = result.job.status === 'idle' && result.sweep.enqueued === 0
    await delay(idle ? settings.pollIntervalMs : 250)
  }
}

main().catch((error) => {
  console.error('FleetGraph worker failed:', error)
  process.exit(1)
})
