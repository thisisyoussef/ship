#!/usr/bin/env node

const runId = readRequiredEnv('AUDIT_RUN_ID');
const callbackBaseUrl = readRequiredEnv('AUDIT_CALLBACK_BASE_URL');
const callbackSecret = readRequiredEnv('AUDIT_CALLBACK_SECRET');
const githubRunId = numberOrNull(process.env.GITHUB_RUN_ID);
const githubRunAttempt = numberOrNull(process.env.GITHUB_RUN_ATTEMPT);
const githubRunUrl = buildGithubRunUrl();

await retry(async () => {
  const response = await fetch(`${trimTrailingSlash(callbackBaseUrl)}/api/internal/runs/${runId}/start`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-audit-callback-secret': callbackSecret,
    },
    body: JSON.stringify({
      githubRunId,
      githubRunAttempt,
      githubRunUrl,
      message: 'GitHub Actions claimed the run and is preparing the workspace.',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Start callback failed (${response.status}): ${errorText || response.statusText}`);
  }
});

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
