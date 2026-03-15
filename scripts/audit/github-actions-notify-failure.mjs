#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const runId = readRequiredEnv('AUDIT_RUN_ID');
const callbackBaseUrl = normalizeOptional(process.env.AUDIT_CALLBACK_BASE_URL);
const callbackSecret = normalizeOptional(process.env.AUDIT_CALLBACK_SECRET);
const githubRunUrl = buildGithubRunUrl();
const githubRunId = numberOrNull(process.env.GITHUB_RUN_ID);
const githubRunAttempt = numberOrNull(process.env.GITHUB_RUN_ATTEMPT);
const message =
  process.env.AUDIT_FAILURE_MESSAGE ||
  'GitHub Actions failed before the audit harness could finish. Open the workflow run for step-level logs.';

console.error(`::error::${message}`);
await writeFailureDiagnostics({
  runId,
  githubRunId,
  githubRunAttempt,
  githubRunUrl,
  message,
});

if (callbackBaseUrl && callbackSecret) {
  await retry(async () => {
    const response = await fetch(`${trimTrailingSlash(callbackBaseUrl)}/api/internal/runs/${runId}/fail`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-audit-callback-secret': callbackSecret,
      },
      body: JSON.stringify({
        githubRunId,
        githubRunAttempt,
        githubRunUrl,
        phase: 'failed',
        error: message,
        details: {
          githubRunUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failure callback failed (${response.status}): ${errorText || response.statusText}`);
    }
  });
}

function buildGithubRunUrl() {
  const serverUrl = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const workflowRunId = process.env.GITHUB_RUN_ID;

  if (!serverUrl || !repository || !workflowRunId) {
    return null;
  }

  return `${trimTrailingSlash(serverUrl)}/${repository}/actions/runs/${workflowRunId}`;
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
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function writeFailureDiagnostics({
  runId,
  githubRunId,
  githubRunAttempt,
  githubRunUrl,
  message,
}) {
  const outputDir = process.env.AUDIT_OUTPUT_DIR;
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  const markdown = [
    '# Audit Runner Failure',
    '',
    `- Status: failed before the audit harness completed`,
    `- Run ID: ${runId}`,
    `- GitHub run: ${githubRunUrl ?? 'n/a'}`,
    '',
    '## Error',
    '',
    '```text',
    message,
    '```',
    '',
  ].join('\n');

  const diagnosticsDir = outputDir ? join(outputDir, 'diagnostics') : null;
  const existingSummaryPath = diagnosticsDir ? join(diagnosticsDir, 'github-summary.md') : null;
  const summaryAlreadyExists = existingSummaryPath ? await fileExists(existingSummaryPath) : false;

  if (stepSummary && !summaryAlreadyExists) {
    await writeFile(stepSummary, markdown, 'utf8');
  }

  if (!outputDir) {
    return;
  }

  await mkdir(diagnosticsDir, { recursive: true });
  await writeFile(
    join(diagnosticsDir, 'failure.json'),
    `${JSON.stringify(
      {
        runId,
        githubRunId,
        githubRunAttempt,
        githubRunUrl,
        error: message,
        failedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  if (!summaryAlreadyExists) {
    await writeFile(join(diagnosticsDir, 'github-summary.md'), markdown, 'utf8');
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
