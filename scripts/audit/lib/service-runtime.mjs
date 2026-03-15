import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import getPort from 'get-port';
import { expandCorpus } from './corpus.mjs';
import { resetSchema, schemaNameForTarget } from './postgres.mjs';
import { createCommandCallbacks } from './run-events.mjs';

export async function prepareSeededSchema({
  baseConnectionString,
  target,
  categoryId,
  runCommand,
  reportEvent,
}) {
  const schema = await resetSchema(
    baseConnectionString,
    schemaNameForTarget(target)
  );

  await runCommand(`${target.label}-${categoryId}-db-migrate`, 'pnpm db:migrate', {
    DATABASE_URL: schema.connectionString,
  });
  await runCommand(`${target.label}-${categoryId}-db-seed`, 'pnpm db:seed', {
    DATABASE_URL: schema.connectionString,
  });

  const counts = await expandCorpus(schema.connectionString);
  reportEvent?.({
    type: 'corpus-ready',
    targetLabel: target.label,
    categoryId,
    phase: 'seed',
    message: `Canonical corpus ready: ${counts.documents} docs / ${counts.issues} issues / ${counts.weeks} weeks / ${counts.users} users`,
    payload: counts,
  });
  return {
    ...schema,
    counts,
  };
}

export async function startApiServer({
  target,
  categoryId,
  connectionString,
  webOrigin,
  traceFile,
  reportEvent,
}) {
  const port = await getPort();
  const command = 'pnpm --filter @ship/api exec tsx src/index.ts';
  const env = {
    DATABASE_URL: connectionString,
    PORT: String(port),
    CORS_ORIGIN: webOrigin,
    SESSION_SECRET: 'audit-session-secret',
    NODE_ENV: 'development',
    AWS_EC2_METADATA_DISABLED: 'true',
  };

  const bootstrapImport = traceFile
    ? await createPgTraceBootstrap(target.dir, categoryId, traceFile)
    : null;

  if (bootstrapImport) {
    env.NODE_OPTIONS = `--import=${bootstrapImport}`;
  }

  const processHandle = await startBackgroundProcess({
    commandId: `${target.label}-${categoryId}-api-server`,
    command,
    cwd: target.dir,
    env,
    outputDir: target.commandsDir,
    ...createCommandCallbacks(reportEvent, {
      targetLabel: target.label,
      categoryId,
      phase: 'runtime',
    }),
    waitFor: async () => {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      return response.ok;
    },
  });

  return {
    ...processHandle,
    apiUrl: `http://127.0.0.1:${port}`,
  };
}

export async function buildAndStartWeb({
  target,
  categoryId,
  apiUrl,
  runCommand,
  port: preferredPort,
  reportEvent,
}) {
  const port = preferredPort ?? await getPort();
  await runCommand(
    `${target.label}-${categoryId}-web-build`,
    'pnpm --filter @ship/web exec vite build',
    {
      VITE_API_URL: apiUrl,
    }
  );

  const processHandle = await startBackgroundProcess({
    commandId: `${target.label}-${categoryId}-web-preview`,
    command: `pnpm --filter @ship/web exec vite preview --host 127.0.0.1 --port ${port}`,
    cwd: target.dir,
    env: {},
    outputDir: target.commandsDir,
    ...createCommandCallbacks(reportEvent, {
      targetLabel: target.label,
      categoryId,
      phase: 'runtime',
    }),
    waitFor: async () => {
      const response = await fetch(`http://127.0.0.1:${port}/login`);
      return response.ok;
    },
  });

  return {
    ...processHandle,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

export async function loginToApi(apiUrl) {
  const csrfResponse = await fetch(`${apiUrl}/api/csrf-token`);
  const csrfCookieHeader = serializeCookies(getSetCookieHeaders(csrfResponse));
  const { token } = await csrfResponse.json();

  const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: csrfCookieHeader,
      'x-csrf-token': token,
    },
    body: JSON.stringify({
      email: 'dev@ship.local',
      password: 'admin123',
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(`API login failed with status ${loginResponse.status}`);
  }

  const sessionCookieHeader = serializeCookies(getSetCookieHeaders(loginResponse));
  const cookieHeader = [csrfCookieHeader, sessionCookieHeader].filter(Boolean).join('; ');

  const documentsResponse = await fetch(`${apiUrl}/api/documents`, {
    headers: { cookie: cookieHeader },
  });
  const documents = await documentsResponse.json();
  const weeksResponse = await fetch(`${apiUrl}/api/weeks`, {
    headers: { cookie: cookieHeader },
  });
  const weeksPayload = await weeksResponse.json();
  const weeks = Array.isArray(weeksPayload) ? weeksPayload : weeksPayload.weeks ?? [];

  return {
    cookieHeader,
    firstDocumentId: documents[0]?.id ?? null,
    firstWeekId: weeks[0]?.id ?? null,
  };
}

export async function runLoadTest({
  url,
  cookieHeader,
  totalRequests,
  concurrency,
  onProgress,
}) {
  const durations = [];
  let successCount = 0;
  let failureCount = 0;
  let cursor = 0;
  let completedCount = 0;
  let lastReportedCount = 0;

  async function worker() {
    while (true) {
      const requestIndex = cursor;
      cursor += 1;
      if (requestIndex >= totalRequests) {
        return;
      }

      const startedAt = performance.now();
      try {
        const response = await fetch(url, {
          headers: { cookie: cookieHeader },
        });
        const elapsed = performance.now() - startedAt;
        durations.push(elapsed);
        if (response.ok) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
      } catch {
        const elapsed = performance.now() - startedAt;
        durations.push(elapsed);
        failureCount += 1;
      } finally {
        completedCount += 1;
        if (
          completedCount === totalRequests ||
          completedCount - lastReportedCount >= Math.max(10, Math.floor(totalRequests / 4))
        ) {
          lastReportedCount = completedCount;
          onProgress?.({
            completedCount,
            totalRequests,
            concurrency,
            percent: Number(((completedCount / totalRequests) * 100).toFixed(2)),
          });
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  durations.sort((left, right) => left - right);

  return {
    totalRequests,
    concurrency,
    successCount,
    failureCount,
    p95Ms: percentile(durations, 95),
    avgMs: average(durations),
    minMs: durations[0] ?? 0,
    maxMs: durations[durations.length - 1] ?? 0,
  };
}

export async function readTraceSince(traceFile, previousLength) {
  const raw = await readFile(traceFile, 'utf8');
  const lines = raw
    .split('\n')
    .filter(Boolean)
    .slice(previousLength)
    .map((line) => JSON.parse(line));
  return {
    entries: lines,
    nextLength: raw.split('\n').filter(Boolean).length,
  };
}

export async function readTraceLength(traceFile) {
  try {
    const raw = await readFile(traceFile, 'utf8');
    return raw.split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

async function createPgTraceBootstrap(targetDir, categoryId, traceFile) {
  const bootstrapDir = join(targetDir, 'api', '.audit-tmp');
  await mkdir(bootstrapDir, { recursive: true });
  const bootstrapPath = join(bootstrapDir, `pg-trace-${categoryId}.mjs`);
  const source = `
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import pg from 'pg';

const traceFile = ${JSON.stringify(traceFile)};
mkdirSync(dirname(traceFile), { recursive: true });

function patchQuery(proto) {
  const original = proto.query;
  proto.query = function patchedQuery(...args) {
    const sql = typeof args[0] === 'string'
      ? args[0]
      : (args[0] && typeof args[0].text === 'string' ? args[0].text : 'unknown');
    const startedAt = performance.now();
    const callback = args[args.length - 1];

    if (typeof callback === 'function') {
      args[args.length - 1] = function patchedCallback(...callbackArgs) {
        appendFileSync(traceFile, JSON.stringify({
          sql,
          durationMs: Number((performance.now() - startedAt).toFixed(2)),
          errored: Boolean(callbackArgs[0]),
        }) + '\\n');
        return callback.apply(this, callbackArgs);
      };
      return original.apply(this, args);
    }

    const result = original.apply(this, args);
    if (result && typeof result.then === 'function') {
      return result.then((value) => {
        appendFileSync(traceFile, JSON.stringify({
          sql,
          durationMs: Number((performance.now() - startedAt).toFixed(2)),
          errored: false,
        }) + '\\n');
        return value;
      }).catch((error) => {
        appendFileSync(traceFile, JSON.stringify({
          sql,
          durationMs: Number((performance.now() - startedAt).toFixed(2)),
          errored: true,
        }) + '\\n');
        throw error;
      });
    }

    return result;
  };
}

patchQuery(pg.Pool.prototype);
if (pg.Client?.prototype) {
  patchQuery(pg.Client.prototype);
}
`;
  await writeFile(bootstrapPath, source, 'utf8');
  return bootstrapPath;
}

async function startBackgroundProcess({
  commandId,
  command,
  cwd,
  env,
  outputDir,
  waitFor,
  onStart,
  onStdout,
  onStderr,
  onReady,
  onStop,
}) {
  const stdoutPath = join(outputDir, `${commandId}.stdout.log`);
  const stderrPath = join(outputDir, `${commandId}.stderr.log`);
  const startedAt = new Date().toISOString();
  const record = {
    id: commandId,
    command,
    cwd,
    env: Object.keys(env).sort(),
    startedAt,
    finishedAt: null,
    exitCode: null,
    signal: null,
    stdoutPath,
    stderrPath,
  };
  onStart?.(record);

  const child = spawn('bash', ['-c', command], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exitPromise = new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }));
  });

  child.stdout.on('data', async (chunk) => {
    await appendFile(stdoutPath, chunk);
    onStdout?.(chunk.toString('utf8'));
  });
  child.stderr.on('data', async (chunk) => {
    await appendFile(stderrPath, chunk);
    onStderr?.(chunk.toString('utf8'));
  });

  await waitForReady(waitFor, 30_000);
  onReady?.(record);

  return {
    record,
    async stop() {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
      }
      const result = await exitPromise;
      record.finishedAt = new Date().toISOString();
      record.exitCode = result.code;
      record.signal = result.signal;
      onStop?.(record);
    },
  };
}

async function waitForReady(check, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await check()) {
        return;
      }
    } catch {
      // Keep polling until the service is up.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timed out waiting for background process readiness');
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const cookie = response.headers.get('set-cookie');
  return cookie ? [cookie] : [];
}

function serializeCookies(setCookieHeaders) {
  return setCookieHeaders
    .map((cookie) => cookie.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0;
  }
  const index = Math.min(
    values.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * values.length) - 1)
  );
  return Number(values[index].toFixed(2));
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

async function appendFile(path, chunk) {
  await writeFile(path, chunk, { flag: 'a' });
}
