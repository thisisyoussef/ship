import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { ensureAuditTables } from './db.js';
import { appendRunEvents, claimNextRun, failRun, finishRun, updateRunProgress } from './store.js';
import { applyProgressEvent, createInitialProgress, type AuditProgressEvent, type ProgressSnapshot } from './progress.js';
// @ts-expect-error The shared audit harness is authored as ESM JavaScript in the repo root.
import { runComparison } from '../../../scripts/audit/lib/run-compare.mjs';

await ensureAuditTables();

while (true) {
  const nextRun = await claimNextRun();
  if (!nextRun) {
    await sleep(5000);
    continue;
  }

  const runMode = nextRun.mode === 'category' ? 'category' : 'full';
  const runCategory = typeof nextRun.category === 'string' ? nextRun.category : null;
  const reporter = createRunReporter(nextRun.id, createInitialProgress(runMode, runCategory));

  try {
    await reporter.start();
    const outputDir = await mkdtemp(join(tmpdir(), `ship-audit-hosted-${nextRun.id}-`));
    const result = await runComparison({
      runId: nextRun.id,
      outputDir,
      category: runCategory ?? undefined,
      baseline: {
        repoUrl: nextRun.baselineRepo,
        ref: nextRun.baselineRef,
      },
      submission: {
        repoUrl: nextRun.submissionRepo,
        ref: nextRun.submissionRef,
      },
      databaseUrl: process.env.RUNNER_DATABASE_URL,
      onEvent: reporter.push,
    });
    await reporter.flush();

    const artifacts = await loadArtifacts(result.outputDir);
    await finishRun({
      runId: nextRun.id,
      baselineSha: result.baselineSummary.sha,
      submissionSha: result.submissionSummary.sha,
      summaryJson: {
        baseline: result.baselineSummary,
        submission: result.submissionSummary,
      },
      comparisonJson: result.comparison,
      artifacts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await reporter.fail(message);
    await failRun(nextRun.id, message);
  }
}

async function loadArtifacts(outputDir: string) {
  const bundlePath = join(outputDir, 'bundle.tgz');
  await runTar(outputDir, bundlePath);

  return [
    {
      name: 'baseline-summary.json',
      contentType: 'application/json',
      body: await readFile(join(outputDir, 'baseline', 'summary.json')),
    },
    {
      name: 'submission-summary.json',
      contentType: 'application/json',
      body: await readFile(join(outputDir, 'submission', 'summary.json')),
    },
    {
      name: 'comparison.json',
      contentType: 'application/json',
      body: await readFile(join(outputDir, 'comparison.json')),
    },
    {
      name: 'dashboard.html',
      contentType: 'text/html; charset=utf-8',
      body: await readFile(join(outputDir, 'dashboard.html')),
    },
    {
      name: 'bundle.tgz',
      contentType: 'application/gzip',
      body: await readFile(bundlePath),
    },
  ];
}

async function runTar(outputDir: string, bundlePath: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('tar', ['-czf', bundlePath, '-C', outputDir, '.'], {
      stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`tar exited with code ${code}`));
    });
  });
}

async function sleep(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createRunReporter(runId: string, initialProgress: ProgressSnapshot) {
  let progress = initialProgress;
  let pendingEvents: Array<ReturnType<typeof toStoredEvents>[number]> = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let flushChain = Promise.resolve();

  async function start() {
    progress = {
      ...progress,
      status: 'running',
      phase: 'queue',
      message: 'Worker claimed the run. Resolving repositories and preparing the audit harness.',
      updatedAt: new Date().toISOString(),
    };
    await updateRunProgress(runId, progress);
  }

  function push(event: AuditProgressEvent) {
    pendingEvents.push(...toStoredEvents(event));
    progress = applyProgressEvent(progress, event);
    scheduleFlush();
  }

  async function fail(message: string) {
    push({
      type: 'run-error',
      level: 'error',
      phase: 'failed',
      message,
      payload: { error: message },
    });
    await flush();
  }

  function scheduleFlush() {
    if (flushTimer) {
      return;
    }
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, 250);
  }

  async function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    const events = pendingEvents;
    const snapshot = progress;
    pendingEvents = [];

    flushChain = flushChain.then(async () => {
      if (events.length > 0) {
        await appendRunEvents(runId, events);
      }
      await updateRunProgress(runId, snapshot);
    });

    await flushChain;
  }

  return {
    start,
    push,
    fail,
    flush,
  };
}

function toStoredEvents(event: AuditProgressEvent) {
  const baseEvent = {
    type: event.type,
    level: event.level ?? 'info',
    phase: event.phase ?? null,
    targetLabel: event.targetLabel ?? null,
    categoryId: event.categoryId ?? null,
    commandId: event.commandId ?? null,
    stream: event.stream ?? null,
    payload: event.payload ?? null,
  };
  const normalizedMessage = stripAnsi(String(event.message ?? ''));

  if (event.type !== 'command-output') {
    return [
      {
        ...baseEvent,
        message: truncateMessage(normalizedMessage.trim() || '(empty output)'),
      },
    ];
  }

  const lines = normalizedMessage
    .split(/[\r\n]+/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(-120);

  if (lines.length === 0) {
    return [];
  }

  return lines.map((line) => ({
    ...baseEvent,
    message: truncateMessage(line),
  }));
}

function truncateMessage(message: string) {
  return message.length > 700 ? `${message.slice(0, 697)}...` : message;
}

function stripAnsi(message: string) {
  return message.replace(/\u001b\[[0-9;]*m/g, '');
}
