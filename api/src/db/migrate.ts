#!/usr/bin/env npx ts-node
/**
 * Database migration script
 * 1. Runs schema.sql for initial table setup
 * 2. Runs numbered migration files from migrations/ folder
 * 3. Tracks completed migrations in schema_migrations table
 */
import { config } from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import { loadProductionSecrets } from '../config/ssm.js'
import { applyDatabaseSchema } from './apply-schema.js'
import { getDatabaseSslConfig } from './connection.js'

// Load .env.local for local development
config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  await loadProductionSecrets()

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: getDatabaseSslConfig(databaseUrl, process.env.NODE_ENV),
  })

  try {
    console.log('Running database migrations...')
    const result = await applyDatabaseSchema(pool, {
      baseDir: __dirname,
      bootstrapFromSchema: true,
      log: (message) => console.log(message),
    })
    if (result.migrationsRun === 0) {
      console.log('✅ All migrations already applied')
    } else {
      console.log(`✅ ${result.migrationsRun} migration(s) applied successfully`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    // "already exists" errors from schema.sql are fine
    if (errorMessage.includes('already exists')) {
      console.log('Database schema already exists, continuing...')
    } else {
      console.error('Database migration failed:', error)
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

migrate()
