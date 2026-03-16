import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

interface QueryableClient {
  query(sql: string, values?: unknown[]): Promise<unknown>
}

interface TransactionalPool extends QueryableClient {
  connect(): Promise<{
    query(sql: string, values?: unknown[]): Promise<unknown>
    release(): void
  }>
}

interface ApplyDatabaseSchemaOptions {
  baseDir: string
  bootstrapFromSchema?: boolean
  log?: (message: string) => void
}

function readMigrationFiles(migrationsDir: string): string[] {
  try {
    return readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
  } catch {
    return []
  }
}

function isDuplicateObjectError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('already exists') || message.includes('duplicate')
}

export async function applyDatabaseSchema(
  pool: TransactionalPool,
  options: ApplyDatabaseSchemaOptions
) {
  const log = options.log ?? (() => {})
  const schemaPath = join(options.baseDir, 'schema.sql')
  const migrationsDir = join(options.baseDir, 'migrations')
  const migrationFiles = readMigrationFiles(migrationsDir)

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE document_type AS ENUM (
        'wiki',
        'issue',
        'program',
        'project',
        'sprint',
        'person',
        'weekly_plan',
        'weekly_retro',
        'standup',
        'weekly_review'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE relationship_type AS ENUM ('parent', 'project', 'sprint', 'program');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  await pool.query(readFileSync(schemaPath, 'utf-8'))
  log('✅ Schema applied')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  const appliedResult = await pool.query(
    'SELECT version FROM schema_migrations ORDER BY version'
  ) as { rows: Array<{ version: string }> }
  const appliedVersions = new Set(
    appliedResult.rows.map((row) => row.version)
  )

  if (options.bootstrapFromSchema && appliedVersions.size === 0) {
    for (const file of migrationFiles) {
      await pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        [file.replace('.sql', '')]
      )
    }

    return {
      migrationsRun: 0,
    }
  }

  let migrationsRun = 0

  for (const file of migrationFiles) {
    const version = file.replace('.sql', '')
    if (appliedVersions.has(version)) {
      continue
    }

    log(`  Running migration: ${file}`)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SAVEPOINT migration_apply')
      try {
        await client.query(readFileSync(join(migrationsDir, file), 'utf-8'))
      } catch (error) {
        if (!isDuplicateObjectError(error)) {
          throw error
        }
        await client.query('ROLLBACK TO SAVEPOINT migration_apply')
      }
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [version]
      )
      await client.query('COMMIT')
      migrationsRun += 1
      log(`  ✅ ${file} applied`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  return {
    migrationsRun,
  }
}
