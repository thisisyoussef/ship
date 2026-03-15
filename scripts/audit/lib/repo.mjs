import { join } from 'node:path';
import { ensureDir, sanitizeName } from './fs.mjs';
import { runLoggedCommand } from './exec.mjs';
import { createCommandCallbacks } from './run-events.mjs';
import { execFileSync } from 'node:child_process';

function runGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

export async function resolveTargetWorkspace({
  label,
  spec,
  runRoot,
  outputDir,
  timeoutMs,
  reportEvent,
}) {
  await ensureDir(outputDir);

  const commands = [];
  const commandsDir = join(outputDir, 'commands');

  let dir = spec.dir;
  if (!dir) {
    const cloneRoot = join(runRoot, 'clones');
    await ensureDir(cloneRoot);
    dir = join(cloneRoot, `${label}-${sanitizeName(spec.ref)}`);
    const cloneRecord = await runLoggedCommand({
      commandId: `${label}-clone`,
      command: `git clone --depth 1 --branch ${shellQuote(spec.ref)} ${shellQuote(spec.repoUrl)} ${shellQuote(dir)}`,
      cwd: runRoot,
      outputDir: commandsDir,
      timeoutMs,
      ...createCommandCallbacks(reportEvent, {
        targetLabel: label,
        phase: 'setup',
      }),
    });
    commands.push(cloneRecord);
  }

  const sha = runGit(['rev-parse', 'HEAD'], dir);
  const repoUrl = spec.repoUrl ?? safeGit(['remote', 'get-url', 'origin'], dir) ?? 'unknown';
  const ref = spec.ref ?? safeGit(['rev-parse', '--abbrev-ref', 'HEAD'], dir) ?? sha;

  return {
    label,
    dir,
    repoUrl,
    ref,
    sha,
    outputDir,
    commandsDir,
    commands,
  };
}

export async function prepareTargetWorkspace(target, timeoutMs, reportEvent) {
  const installRecord = await runLoggedCommand({
    commandId: `${target.label}-install`,
    command: 'pnpm install --frozen-lockfile',
    cwd: target.dir,
    env: { AUDIT_SKIP_GIT_CONFIG: '1', HUSKY: '0' },
    outputDir: target.commandsDir,
    timeoutMs,
    ...createCommandCallbacks(reportEvent, {
      targetLabel: target.label,
      phase: 'setup',
    }),
  });
  target.commands.push(installRecord);

  const buildSharedRecord = await runLoggedCommand({
    commandId: `${target.label}-build-shared`,
    command: 'pnpm build:shared',
    cwd: target.dir,
    outputDir: target.commandsDir,
    timeoutMs,
    ...createCommandCallbacks(reportEvent, {
      targetLabel: target.label,
      phase: 'setup',
    }),
  });
  target.commands.push(buildSharedRecord);

  return target;
}

export function createTargetSummary(target) {
  return {
    label: target.label,
    repoUrl: target.repoUrl,
    ref: target.ref,
    sha: target.sha,
    measuredAt: null,
    corpus: null,
    commands: [...target.commands],
    categories: {},
  };
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function safeGit(args, cwd) {
  try {
    return runGit(args, cwd);
  } catch {
    return null;
  }
}
