import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { ensureAuditTables } from './db.js';
import { claimNextRun, failRun, finishRun } from './store.js';
// @ts-expect-error The shared audit harness is authored as ESM JavaScript in the repo root.
import { runComparison } from '../../../scripts/audit/lib/run-compare.mjs';

await ensureAuditTables();

while (true) {
  const nextRun = await claimNextRun();
  if (!nextRun) {
    await sleep(5000);
    continue;
  }

  try {
    const outputDir = await mkdtemp(join(tmpdir(), `ship-audit-hosted-${nextRun.id}-`));
    const result = await runComparison({
      runId: nextRun.id,
      outputDir,
      baseline: {
        repoUrl: nextRun.baselineRepo,
        ref: nextRun.baselineRef,
      },
      submission: {
        repoUrl: nextRun.submissionRepo,
        ref: nextRun.submissionRef,
      },
      databaseUrl: process.env.RUNNER_DATABASE_URL,
    });

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
    await failRun(nextRun.id, error instanceof Error ? error.message : String(error));
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
