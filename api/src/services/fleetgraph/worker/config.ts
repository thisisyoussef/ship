import type { FleetGraphWorkerSettings } from './types.js'

const DEFAULT_EVENT_DEBOUNCE_MS = 90_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_POLL_INTERVAL_MS = 5_000
const DEFAULT_RETRY_DELAY_MS = 60_000
const DEFAULT_SWEEP_BATCH_SIZE = 25
const DEFAULT_SWEEP_INTERVAL_MS = 120_000

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function resolveFleetGraphWorkerSettings(): FleetGraphWorkerSettings {
  return {
    eventDebounceMs: parsePositiveInteger(
      process.env.FLEETGRAPH_EVENT_DEBOUNCE_MS,
      DEFAULT_EVENT_DEBOUNCE_MS
    ),
    maxAttempts: parsePositiveInteger(
      process.env.FLEETGRAPH_MAX_ATTEMPTS,
      DEFAULT_MAX_ATTEMPTS
    ),
    pollIntervalMs: parsePositiveInteger(
      process.env.FLEETGRAPH_WORKER_POLL_INTERVAL_MS,
      DEFAULT_POLL_INTERVAL_MS
    ),
    retryDelayMs: parsePositiveInteger(
      process.env.FLEETGRAPH_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS
    ),
    sweepBatchSize: parsePositiveInteger(
      process.env.FLEETGRAPH_SWEEP_BATCH_SIZE,
      DEFAULT_SWEEP_BATCH_SIZE
    ),
    sweepIntervalMs: parsePositiveInteger(
      process.env.FLEETGRAPH_SWEEP_INTERVAL_MS,
      DEFAULT_SWEEP_INTERVAL_MS
    ),
  }
}
