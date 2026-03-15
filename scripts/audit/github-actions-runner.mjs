#!/usr/bin/env node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runComparison } from './lib/run-compare.mjs';

const config = loadConfig();
const callback = createCallbackClient(config);
const outputDir = config.outputDir;
const reporter = createEventReporter(callback);

try {
  await callback.post('start', {
    githubRunId: config.githubRunId,
    githubRunAttempt: config.githubRunAttempt,
    githubRunUrl: config.githubRunUrl,
    message: `GitHub Actions started the ${config.mode} audit run.`,
  });

  const result = await runComparison({
    runId: config.runId,
    category: config.category ?? undefined,
    baseline: {
      repoUrl: config.baselineRepo,
      ref: config.baselineRef,
    },
    submission: {
      repoUrl: config.submissionRepo,
      ref: config.submissionRef,
    },
    outputDir,
    databaseUrl: config.databaseUrl,
    onEvent: reporter.push,
  });

  await reporter.flush();

  const artifacts = await collectArtifacts(outputDir);
  await callback.post('complete', {
    githubRunId: config.githubRunId,
    githubRunAttempt: config.githubRunAttempt,
    githubRunUrl: config.githubRunUrl,
    baselineSha: result.baselineSummary.sha,
    submissionSha: result.submissionSummary.sha,
    summaryJson: {
      baseline: result.baselineSummary,
      submission: result.submissionSummary,
    },
    comparisonJson: result.comparison,
    artifacts,
    outputDir,
    message: 'GitHub Actions finished the audit run and uploaded all tracked artifacts.',
  });

  console.log(`Audit run ${config.runId} completed successfully.`);
} catch (error) {
  await reporter.flush().catch(() => {});
  const message = error instanceof Error ? `${error.message}${error.stack ? `\n${error.stack}` : ''}` : String(error);
  await callback
    .post('fail', {
      githubRunId: config.githubRunId,
      githubRunAttempt: config.githubRunAttempt,
      githubRunUrl: config.githubRunUrl,
      phase: 'failed',
      error: message,
      details: {
        runId: config.runId,
      },
    })
    .catch(() => {});
  throw error;
}

function loadConfig() {
  const runId = readRequiredEnv('AUDIT_RUN_ID');
  const mode = process.env.AUDIT_MODE === 'category' ? 'category' : 'full';
  const category = normalizeOptional(process.env.AUDIT_CATEGORY);
  const callbackBaseUrl = normalizeOptional(process.env.AUDIT_CALLBACK_BASE_URL);
  const callbackSecret = normalizeOptional(process.env.AUDIT_CALLBACK_SECRET);
  const outputDir = resolve(
    process.env.AUDIT_OUTPUT_DIR || join(process.cwd(), 'artifacts', 'g4-repro', `actions-${runId}`)
  );

  return {
    runId,
    mode,
    category,
    baselineRepo: readRequiredEnv('AUDIT_BASELINE_REPO'),
    baselineRef: readRequiredEnv('AUDIT_BASELINE_REF'),
    submissionRepo: readRequiredEnv('AUDIT_SUBMISSION_REPO'),
    submissionRef: readRequiredEnv('AUDIT_SUBMISSION_REF'),
    callbackBaseUrl,
    callbackSecret,
    outputDir,
    databaseUrl: process.env.RUNNER_DATABASE_URL || process.env.AUDIT_DATABASE_URL || '',
    githubRunId: numberOrNull(process.env.GITHUB_RUN_ID),
    githubRunAttempt: numberOrNull(process.env.GITHUB_RUN_ATTEMPT),
    githubRunUrl: buildGithubRunUrl(),
  };
}

function createCallbackClient(config) {
  if (!config.callbackBaseUrl || !config.callbackSecret) {
    return {
      async post() {},
    };
  }

  const baseHeaders = {
    'content-type': 'application/json',
    'x-audit-callback-secret': config.callbackSecret,
  };

  return {
    async post(action, payload) {
      const url = `${trimTrailingSlash(config.callbackBaseUrl)}/api/internal/runs/${config.runId}/${action}`;
      await retry(async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Callback ${action} failed (${response.status}): ${errorText || response.statusText}`);
        }
      });
    },
  };
}

function createEventReporter(callback) {
  let events = [];
  let flushTimer = null;
  let flushChain = Promise.resolve();

  function push(event) {
    events.push(event);
    if (events.length >= 25) {
      void flush();
      return;
    }
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flush();
      }, 250);
    }
  }

  async function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    const currentBatch = events;
    events = [];
    if (currentBatch.length === 0) {
      return;
    }

    flushChain = flushChain.then(() => callback.post('events', { events: currentBatch }));
    await flushChain;
  }

  return {
    push,
    flush,
  };
}

async function collectArtifacts(outputDir) {
  const bundleDir = await mkdtemp(join(tmpdir(), 'ship-audit-bundle-'));
  const bundlePath = join(bundleDir, 'bundle.tgz');

  try {
    await runTar(outputDir, bundlePath);

    return [
      {
        name: 'baseline-summary.json',
        contentType: 'application/json',
        bodyBase64: await readBase64(join(outputDir, 'baseline', 'summary.json')),
      },
      {
        name: 'submission-summary.json',
        contentType: 'application/json',
        bodyBase64: await readBase64(join(outputDir, 'submission', 'summary.json')),
      },
      {
        name: 'comparison.json',
        contentType: 'application/json',
        bodyBase64: await readBase64(join(outputDir, 'comparison.json')),
      },
      {
        name: 'dashboard.html',
        contentType: 'text/html; charset=utf-8',
        bodyBase64: await readBase64(join(outputDir, 'dashboard.html')),
      },
      {
        name: 'bundle.tgz',
        contentType: 'application/gzip',
        bodyBase64: await readBase64(bundlePath),
      },
    ];
  } finally {
    await rm(bundleDir, { recursive: true, force: true });
  }
}

async function readBase64(filePath) {
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

async function runTar(outputDir, bundlePath) {
  await new Promise((resolve, reject) => {
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

async function retry(operation, attempts = 5) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      await sleep(attempt * 750);
    }
  }
  throw lastError;
}

function buildGithubRunUrl() {
  const serverUrl = normalizeOptional(process.env.GITHUB_SERVER_URL);
  const repository = normalizeOptional(process.env.GITHUB_REPOSITORY);
  const runId = normalizeOptional(process.env.GITHUB_RUN_ID);

  if (!serverUrl || !repository || !runId) {
    return null;
  }

  return `${trimTrailingSlash(serverUrl)}/${repository}/actions/runs/${runId}`;
}

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeOptional(value) {
  return value && value.length > 0 ? value : null;
}

function numberOrNull(value) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
