import type {
  FleetGraphMode,
  FleetGraphOutcome,
  FleetGraphState,
  FleetGraphTrigger,
} from '../graph/types.js'

export const FLEETGRAPH_JOB_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
] as const

export type FleetGraphJobStatus =
  (typeof FLEETGRAPH_JOB_STATUSES)[number]

export interface FleetGraphWorkerSettings {
  eventDebounceMs: number
  maxAttempts: number
  pollIntervalMs: number
  retryDelayMs: number
  sweepBatchSize: number
  sweepIntervalMs: number
}

export interface FleetGraphEnqueueInput {
  actorId?: string
  availableAt?: Date
  dedupeKey: string
  documentId?: string
  documentType?: string
  mode: FleetGraphMode
  routeSurface?: string
  threadId: string
  trigger: FleetGraphTrigger
  workspaceId: string
}

export interface FleetGraphQueueJob {
  actorId?: string
  attemptCount: number
  availableAt: Date
  createdAt: Date
  dedupeKey: string
  documentId?: string
  documentType?: string
  finishedAt?: Date
  id: string
  lastError?: string
  maxAttempts: number
  mode: FleetGraphMode
  payload: Record<string, unknown>
  routeSurface?: string
  startedAt?: Date
  status: FleetGraphJobStatus
  threadId: string
  trigger: FleetGraphTrigger
  updatedAt: Date
  workspaceId: string
}

export interface FleetGraphDedupeLedger {
  checkpointBranch?: string
  checkpointOutcome?: string
  checkpointPath: string[]
  createdAt: Date
  dedupeKey: string
  lastCompletedAt?: Date
  lastEnqueuedAt?: Date
  lastError?: string
  lastJobId?: string
  lastOutcome?: FleetGraphOutcome | 'failed'
  lastStartedAt?: Date
  nextEligibleAt?: Date
  threadId: string
  updatedAt: Date
  workspaceId: string
}

export interface FleetGraphSweepSchedule {
  createdAt: Date
  enabled: boolean
  lastSweptAt?: Date
  nextSweepAt: Date
  updatedAt: Date
  workspaceId: string
}

export interface FleetGraphEnqueueResult {
  job: FleetGraphQueueJob | null
  ledger: FleetGraphDedupeLedger
  status: 'blocked' | 'deduped' | 'enqueued'
}

export interface FleetGraphRunNextResult {
  job: FleetGraphQueueJob | null
  state?: FleetGraphState
  status: 'completed' | 'failed' | 'idle' | 'requeued'
}

export interface FleetGraphSweepResult {
  blocked: number
  claimed: number
  deduped: number
  enqueued: number
}

export interface FleetGraphWorkerStore {
  claimDueSweepSchedules(now: Date, limit: number, sweepIntervalMs: number): Promise<FleetGraphSweepSchedule[]>
  claimNextJob(now: Date): Promise<FleetGraphQueueJob | null>
  completeJob(jobId: string, state: FleetGraphState, checkpoint: unknown, now: Date, cooldownMs: number): Promise<FleetGraphQueueJob>
  enqueue(input: FleetGraphEnqueueInput, now: Date, maxAttempts: number): Promise<FleetGraphEnqueueResult>
  failJob(jobId: string, errorMessage: string, checkpoint: unknown, now: Date, retryDelayMs: number): Promise<FleetGraphQueueJob>
  getLedger(dedupeKey: string): Promise<FleetGraphDedupeLedger | null>
  getQueueJob(jobId: string): Promise<FleetGraphQueueJob | null>
  listQueueJobs(): Promise<FleetGraphQueueJob[]>
  registerWorkspaceSweep(workspaceId: string, nextSweepAt: Date): Promise<FleetGraphSweepSchedule>
}

export interface FleetGraphWorkerRuntimeDeps {
  now?: () => Date
  runtime: {
    getState(threadId: string): Promise<unknown>
    invoke(input: unknown): Promise<FleetGraphState>
  }
  settings: FleetGraphWorkerSettings
  store: FleetGraphWorkerStore
}
