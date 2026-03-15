type DispatchAuditRunInput = {
  runId: string;
  mode: 'full' | 'category';
  category: string | null;
  baselineRepo: string;
  baselineRef: string;
  submissionRepo: string;
  submissionRef: string;
  callbackBaseUrl: string;
};

const DEFAULT_REPOSITORY = 'thisisyoussef/ship';
const DEFAULT_WORKFLOW = 'audit-runner.yml';
const DEFAULT_WORKFLOW_REF = 'codex/submission-clean';

export async function dispatchAuditRun(input: DispatchAuditRunInput) {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  if (!token) {
    throw new Error('GITHUB_ACTIONS_TOKEN is not configured');
  }

  const repository = process.env.GITHUB_ACTIONS_REPO ?? DEFAULT_REPOSITORY;
  const workflowFile = process.env.GITHUB_ACTIONS_WORKFLOW_FILE ?? DEFAULT_WORKFLOW;
  const workflowRef = process.env.GITHUB_ACTIONS_WORKFLOW_REF ?? DEFAULT_WORKFLOW_REF;
  const callbackBaseUrl = normalizeBaseUrl(input.callbackBaseUrl);

  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'ship-audit-dashboard',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: workflowRef,
        inputs: {
          run_id: input.runId,
          mode: input.mode,
          category: input.category ?? '',
          baseline_repo: input.baselineRepo,
          baseline_ref: input.baselineRef,
          submission_repo: input.submissionRepo,
          submission_ref: input.submissionRef,
          callback_base_url: callbackBaseUrl,
        },
      }),
    }
  );

  if (response.ok) {
    return;
  }

  const errorText = await response.text();
  throw new Error(
    `GitHub Actions dispatch failed (${response.status}): ${errorText || response.statusText}`
  );
}

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
