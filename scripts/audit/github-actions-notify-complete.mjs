#!/usr/bin/env node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const runId = readRequiredEnv('AUDIT_RUN_ID');
const callbackBaseUrl = readRequiredEnv('AUDIT_CALLBACK_BASE_URL');
const callbackSecret = readRequiredEnv('AUDIT_CALLBACK_SECRET');
const outputDir = readRequiredEnv('AUDIT_OUTPUT_DIR');
const githubRunId = numberOrNull(process.env.GITHUB_RUN_ID);
const githubRunAttempt = numberOrNull(process.env.GITHUB_RUN_ATTEMPT);
const githubRunUrl = buildGithubRunUrl();

const baselineSummary = await readJson(join(outputDir, 'baseline', 'summary.json'));
const submissionSummary = await readJson(join(outputDir, 'submission', 'summary.json'));
const comparisonJson = await readJson(join(outputDir, 'comparison.json'));
const artifacts = await collectArtifacts(outputDir);

await retry(async () => {
  const response = await fetch(`${trimTrailingSlash(callbackBaseUrl)}/api/internal/runs/${runId}/complete`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-audit-callback-secret': callbackSecret,
    },
    body: JSON.stringify({
      githubRunId,
      githubRunAttempt,
      githubRunUrl,
      baselineSha: baselineSummary.sha,
      submissionSha: submissionSummary.sha,
      summaryJson: {
        baseline: baselineSummary,
        submission: submissionSummary,
      },
      comparisonJson,
      artifacts,
      outputDir,
      message: 'GitHub Actions finished the aggregate audit report and uploaded the final evidence bundle.',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Completion callback failed (${response.status}): ${errorText || response.statusText}`);
  }
});

async function collectArtifacts(outputDir) {
  const bundleDir = await mkdtemp(join(tmpdir(), 'ship-audit-bundle-'));
  const bundlePath = join(bundleDir, 'bundle.tgz');

  try {
    const artifacts = [];
    const artifactSpecs = [
      ['baseline-summary.json', join(outputDir, 'baseline', 'summary.json'), 'application/json'],
      ['submission-summary.json', join(outputDir, 'submission', 'summary.json'), 'application/json'],
      ['comparison.json', join(outputDir, 'comparison.json'), 'application/json'],
      ['dashboard.html', join(outputDir, 'dashboard.html'), 'text/html; charset=utf-8'],
      ['run-context.json', join(outputDir, 'diagnostics', 'run-context.json'), 'application/json'],
      ['category-artifacts.json', join(outputDir, 'diagnostics', 'category-artifacts.json'), 'application/json'],
      ['github-summary.md', join(outputDir, 'diagnostics', 'github-summary.md'), 'text/markdown; charset=utf-8'],
      ['report.md', join(outputDir, 'diagnostics', 'report.md'), 'text/markdown; charset=utf-8'],
    ];

    for (const [name, filePath, contentType] of artifactSpecs) {
      const artifact = await maybeReadArtifact(name, filePath, contentType);
      if (artifact) {
        artifacts.push(artifact);
      }
    }

    await runTar(outputDir, bundlePath);
    artifacts.push({
      name: 'bundle.tgz',
      contentType: 'application/gzip',
      bodyBase64: await readBase64(bundlePath),
    });

    return artifacts;
  } finally {
    await rm(bundleDir, { recursive: true, force: true });
  }
}

async function maybeReadArtifact(name, filePath, contentType) {
  try {
    return {
      name,
      contentType,
      bodyBase64: await readBase64(filePath),
    };
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }
    throw error;
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
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

function numberOrNull(value) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function isMissingFile(error) {
  return Boolean(error) && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
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
