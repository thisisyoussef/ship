import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool } from 'pg'

import { applyDatabaseSchema } from '../../../db/apply-schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function createWorkerTestDatabase() {
  const container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('ship_test')
    .withUsername('test')
    .withPassword('test')
    .start()

  const pool = new Pool({
    connectionString: container.getConnectionUri(),
  })

  await applyDatabaseSchema(pool, {
    baseDir: join(__dirname, '../../../db'),
    bootstrapFromSchema: true,
  })

  return {
    async close() {
      await pool.end()
      await container.stop()
    },
    pool,
  }
}
