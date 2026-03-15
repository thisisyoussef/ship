import cookieParser from 'cookie-parser';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { ensureAuditTables } from './db.js';
import { recordAuditEvents } from './events.js';
import { dispatchAuditRun } from './github-actions.js';
import { buildRecipes } from './recipes.js';
import { createRun, failRun, finishRun, getArtifact, getRun, listRunEvents, listRuns, markRunStarted } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDist = join(__dirname, '../client');
const app = express();

const sessionSecret = process.env.AUDIT_SESSION_SECRET || process.env.AUDIT_APP_PASSWORD || 'ship-audit-secret';
const callbackSecret = process.env.AUDIT_CALLBACK_SECRET || '';

await ensureAuditTables();

app.set('trust proxy', true);
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser(sessionSecret));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/session', (request, response) => {
  response.json({ authenticated: request.signedCookies.audit_session === 'authenticated' });
});

app.post('/api/login', (request, response) => {
  const expectedPassword = process.env.AUDIT_APP_PASSWORD;
  if (!expectedPassword || request.body?.password !== expectedPassword) {
    response.status(401).json({ error: 'Invalid password' });
    return;
  }

  response.cookie('audit_session', 'authenticated', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
  response.json({ ok: true });
});

app.post('/api/logout', (_request, response) => {
  response.clearCookie('audit_session');
  response.status(204).end();
});

app.use('/api', (request, response, next) => {
  if (request.path === '/session' || request.path === '/login') {
    next();
    return;
  }
  if (request.path.startsWith('/internal/')) {
    next();
    return;
  }
  if (request.signedCookies.audit_session !== 'authenticated') {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

app.get('/api/runs', async (_request, response) => {
  response.json({ runs: await listRuns() });
});

app.post('/api/runs', async (request, response) => {
  const run = await createRun({
    mode: request.body?.mode === 'category' ? 'category' : 'full',
    category: request.body?.category ?? null,
    baselineRepo: String(request.body?.baselineRepo ?? ''),
    baselineRef: String(request.body?.baselineRef ?? ''),
    submissionRepo: String(request.body?.submissionRepo ?? ''),
    submissionRef: String(request.body?.submissionRef ?? ''),
  });

  try {
    const callbackBaseUrl = process.env.AUDIT_PUBLIC_BASE_URL || `${request.protocol}://${request.get('host')}`;
    await dispatchAuditRun({
      runId: run.id,
      mode: run.mode === 'category' ? 'category' : 'full',
      category: run.category,
      baselineRepo: run.baselineRepo,
      baselineRef: run.baselineRef,
      submissionRepo: run.submissionRepo,
      submissionRef: run.submissionRef,
      callbackBaseUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordAuditEvents(run.id, [
      {
        type: 'run-error',
        level: 'error',
        phase: 'queue',
        message,
        payload: { error: message },
      },
    ]);
    await failRun(run.id, message);
    const failedRun = await getRun(run.id);
    response.status(502).json({
      error: message,
      run: failedRun,
    });
    return;
  }

  response.status(201).json({ run: await getRun(run.id) });
});

app.get('/api/runs/:id', async (request, response) => {
  const run = await getRun(request.params.id);
  if (!run) {
    response.status(404).json({ error: 'Run not found' });
    return;
  }
  response.json({ run });
});

app.get('/api/runs/:id/events', async (request, response) => {
  const run = await getRun(request.params.id);
  if (!run) {
    response.status(404).json({ error: 'Run not found' });
    return;
  }

  const after = Number.parseInt(String(request.query.after ?? '0'), 10);
  const limit = Number.parseInt(String(request.query.limit ?? '300'), 10);
  const events = await listRunEvents(
    request.params.id,
    Number.isFinite(after) ? after : 0,
    Number.isFinite(limit) ? limit : 300
  );
  response.json({
    run,
    events,
    nextCursor: events.at(-1)?.id ?? after ?? 0,
  });
});

app.get('/api/runs/:id/recipe', async (request, response) => {
  const run = await getRun(request.params.id);
  if (!run) {
    response.status(404).json({ error: 'Run not found' });
    return;
  }
  response.json(buildRecipes(run));
});

app.get('/api/runs/:id/artifacts/:name', async (request, response) => {
  const artifact = await getArtifact(request.params.id, request.params.name);
  if (!artifact) {
    response.status(404).json({ error: 'Artifact not found' });
    return;
  }
  response.setHeader('content-type', artifact.content_type);
  response.send(artifact.body);
});

app.post('/api/internal/runs/:id/start', requireInternalAuth, async (request, response) => {
  const runId = String(request.params.id ?? '');
  const run = await getRun(runId);
  if (!run) {
    response.status(404).json({ error: 'Run not found' });
    return;
  }

  const githubRunId = numberOrNull(request.body?.githubRunId);
  const githubRunAttempt = numberOrNull(request.body?.githubRunAttempt);
  const githubRunUrl = stringOrNull(request.body?.githubRunUrl);

  await markRunStarted({
    runId,
    githubRunId,
    githubRunAttempt,
    githubRunUrl,
  });
  await recordAuditEvents(runId, [
    {
      type: 'run-start',
      level: 'info',
      phase: 'queue',
      message: String(request.body?.message ?? 'GitHub Actions picked up the run.'),
      payload: {
        githubRunId,
        githubRunAttempt,
        githubRunUrl,
      },
    },
  ]);
  response.status(204).end();
});

app.post('/api/internal/runs/:id/events', requireInternalAuth, async (request, response) => {
  const runId = String(request.params.id ?? '');
  const run = await getRun(runId);
  if (!run) {
    response.status(404).json({ error: 'Run not found' });
    return;
  }

  const events = Array.isArray(request.body?.events)
    ? request.body.events.filter(
        (event: unknown): event is Record<string, unknown> => Boolean(event && typeof event === 'object')
      )
    : [];
  await recordAuditEvents(
    runId,
    events.map((event: Record<string, unknown>) => ({
      timestamp: stringOrNull(event.timestamp) ?? new Date().toISOString(),
      type: String(event.type ?? 'command-output'),
      level: stringOrNull(event.level) ?? 'info',
      phase: stringOrNull(event.phase),
      targetLabel: stringOrNull(event.targetLabel),
      categoryId: stringOrNull(event.categoryId),
      commandId: stringOrNull(event.commandId),
      stream: stringOrNull(event.stream),
      message: String(event.message ?? ''),
      payload: isObject(event.payload) ? event.payload : null,
    }))
  );
  response.status(204).end();
});

app.post('/api/internal/runs/:id/complete', requireInternalAuth, async (request, response) => {
  const runId = String(request.params.id ?? '');
  const run = await getRun(runId);
  if (!run) {
    response.status(404).json({ error: 'Run not found' });
    return;
  }

  await markRunStarted({
    runId,
    githubRunId: numberOrNull(request.body?.githubRunId),
    githubRunAttempt: numberOrNull(request.body?.githubRunAttempt),
    githubRunUrl: stringOrNull(request.body?.githubRunUrl),
  });

  await recordAuditEvents(runId, [
    {
      type: 'run-finished',
      level: 'success',
      phase: 'finalize',
      message: String(request.body?.message ?? 'GitHub Actions finished writing artifacts.'),
      payload: {
        outputDir: stringOrNull(request.body?.outputDir),
      },
    },
  ]);

  const artifacts = Array.isArray(request.body?.artifacts)
    ? request.body.artifacts
        .filter(
          (artifact: unknown): artifact is Record<string, unknown> => Boolean(artifact && typeof artifact === 'object')
        )
        .map((artifact: Record<string, unknown>) => ({
          name: String(artifact.name ?? 'artifact.bin'),
          contentType: String(artifact.contentType ?? 'application/octet-stream'),
          body: Buffer.from(String(artifact.bodyBase64 ?? ''), 'base64'),
        }))
    : [];

  await finishRun({
    runId,
    baselineSha: String(request.body?.baselineSha ?? ''),
    submissionSha: String(request.body?.submissionSha ?? ''),
    summaryJson: request.body?.summaryJson ?? null,
    comparisonJson: request.body?.comparisonJson ?? null,
    artifacts,
  });
  response.status(204).end();
});

app.post('/api/internal/runs/:id/fail', requireInternalAuth, async (request, response) => {
  const runId = String(request.params.id ?? '');
  const run = await getRun(runId);
  if (!run) {
    response.status(404).json({ error: 'Run not found' });
    return;
  }

  await markRunStarted({
    runId,
    githubRunId: numberOrNull(request.body?.githubRunId),
    githubRunAttempt: numberOrNull(request.body?.githubRunAttempt),
    githubRunUrl: stringOrNull(request.body?.githubRunUrl),
  });

  const message = String(request.body?.error ?? request.body?.message ?? 'GitHub Actions reported a failure.');
  await recordAuditEvents(runId, [
    {
      type: 'run-error',
      level: 'error',
      phase: stringOrNull(request.body?.phase) ?? 'failed',
      message,
      payload: isObject(request.body?.details) ? request.body.details : { error: message },
    },
  ]);
  await failRun(runId, message);
  response.status(204).end();
});

app.use(express.static(clientDist));

app.get('*', async (_request, response) => {
  const indexHtml = await readFile(join(clientDist, 'index.html'), 'utf8');
  response.type('html').send(indexHtml);
});

const port = Number(process.env.PORT ?? 10000);
app.listen(port, () => {
  console.log(`Audit dashboard listening on ${port}`);
});

function requireInternalAuth(request: express.Request, response: express.Response, next: express.NextFunction) {
  if (!callbackSecret) {
    response.status(503).json({ error: 'AUDIT_CALLBACK_SECRET is not configured' });
    return;
  }
  if (request.get('x-audit-callback-secret') !== callbackSecret) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
