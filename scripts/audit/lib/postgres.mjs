import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { sanitizeName } from './fs.mjs';
import { basename, dirname } from 'node:path';

const { Pool } = pg;

export async function createDatabaseHarness(baseConnectionString) {
  if (baseConnectionString) {
    return {
      baseConnectionString,
      source: 'external',
      async stop() {},
    };
  }

  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('ship_audit')
    .withUsername('postgres')
    .withPassword('postgres')
    .withStartupTimeout(60_000)
    .start();

  return {
    baseConnectionString: container.getConnectionUri(),
    source: 'testcontainers',
    async stop() {
      await container.stop();
    },
  };
}

export function buildSchemaConnectionString(baseConnectionString, schemaName) {
  const url = new URL(baseConnectionString);
  url.searchParams.set('options', `-csearch_path=${schemaName},public`);
  return url.toString();
}

export async function resetSchema(baseConnectionString, schemaName) {
  const safeSchemaName = sanitizeName(schemaName).replace(/-/g, '_');
  const pool = new Pool({ connectionString: baseConnectionString, ssl: false });

  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await pool.query(`DROP SCHEMA IF EXISTS "${safeSchemaName}" CASCADE`);
    await pool.query(`CREATE SCHEMA "${safeSchemaName}"`);
  } finally {
    await pool.end();
  }

  return {
    schemaName: safeSchemaName,
    connectionString: buildSchemaConnectionString(baseConnectionString, safeSchemaName),
  };
}

export function schemaNameForTarget(target) {
  const runId = basename(dirname(target.outputDir));
  return `${runId}_${target.label}_${target.sha.slice(0, 7)}`;
}

export async function withPool(connectionString, callback) {
  const pool = new Pool({ connectionString, ssl: false });
  try {
    return await callback(pool);
  } finally {
    await pool.end();
  }
}
