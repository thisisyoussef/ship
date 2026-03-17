import {
  MemorySaver,
  type BaseCheckpointSaver,
} from '@langchain/langgraph'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import type { Pool } from 'pg'

import { pool as defaultPool } from '../../../db/client.js'

export type FleetGraphCheckpointerKind =
  | 'custom'
  | 'memory'
  | 'postgres'

export interface FleetGraphCheckpointerBundle {
  checkpointer: BaseCheckpointSaver
  ensureReady(): Promise<void>
  kind: FleetGraphCheckpointerKind
}

interface FleetGraphCheckpointerDeps {
  checkpointer?: BaseCheckpointSaver
  pool?: Pool
}

let sharedPostgresSaver: PostgresSaver | null = null
let sharedPostgresSetup: Promise<void> | null = null

function ensurePostgresSaver(pool: Pool) {
  if (!sharedPostgresSaver) {
    sharedPostgresSaver = new PostgresSaver(pool)
  }

  if (!sharedPostgresSetup) {
    sharedPostgresSetup = sharedPostgresSaver.setup()
  }

  return {
    checkpointer: sharedPostgresSaver,
    ensureReady: () => sharedPostgresSetup as Promise<void>,
    kind: 'postgres' as const,
  }
}

export function createFleetGraphCheckpointer(
  deps: FleetGraphCheckpointerDeps = {}
): FleetGraphCheckpointerBundle {
  if (deps.checkpointer) {
    return {
      checkpointer: deps.checkpointer,
      ensureReady: async () => {},
      kind: 'custom',
    }
  }

  if (!process.env.DATABASE_URL) {
    return {
      checkpointer: new MemorySaver(),
      ensureReady: async () => {},
      kind: 'memory',
    }
  }

  return ensurePostgresSaver(deps.pool ?? defaultPool)
}
