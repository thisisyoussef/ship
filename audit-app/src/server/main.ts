import cookieParser from 'cookie-parser';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { ensureAuditTables } from './db.js';
import { createRun, getArtifact, getRun, listRunEvents, listRuns } from './store.js';
import { buildRecipes } from './recipes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDist = join(__dirname, '../client');
const app = express();

const sessionSecret = process.env.AUDIT_SESSION_SECRET || process.env.AUDIT_APP_PASSWORD || 'ship-audit-secret';

await ensureAuditTables();

app.use(express.json({ limit: '2mb' }));
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
  response.status(201).json({ run });
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

app.use(express.static(clientDist));

app.get('*', async (_request, response) => {
  const indexHtml = await readFile(join(clientDist, 'index.html'), 'utf8');
  response.type('html').send(indexHtml);
});

const port = Number(process.env.PORT ?? 10000);
app.listen(port, () => {
  console.log(`Audit dashboard listening on ${port}`);
});
