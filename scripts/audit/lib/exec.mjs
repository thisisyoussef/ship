import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { ensureDir } from './fs.mjs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

export async function runLoggedCommand({
  commandId,
  command,
  cwd,
  env = {},
  outputDir,
  timeoutMs,
  allowFailure = false,
}) {
  await ensureDir(outputDir);

  const stdoutPath = join(outputDir, `${commandId}.stdout.log`);
  const stderrPath = join(outputDir, `${commandId}.stderr.log`);
  const stdoutStream = createWriteStream(stdoutPath, { flags: 'w' });
  const stderrStream = createWriteStream(stderrPath, { flags: 'w' });

  const startedAt = new Date().toISOString();

  const child = spawn('bash', ['-c', command], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const timer = timeoutMs
    ? setTimeout(() => {
        child.kill('SIGTERM');
      }, timeoutMs)
    : null;

  child.stdout.on('data', (chunk) => stdoutStream.write(chunk));
  child.stderr.on('data', (chunk) => stderrStream.write(chunk));

  const result = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });

  if (timer) {
    clearTimeout(timer);
  }

  stdoutStream.end();
  stderrStream.end();
  await Promise.all([once(stdoutStream, 'finish'), once(stderrStream, 'finish')]);

  const finishedAt = new Date().toISOString();
  const record = {
    id: commandId,
    command,
    cwd,
    env: Object.keys(env).sort(),
    startedAt,
    finishedAt,
    exitCode: result.code,
    signal: result.signal,
    stdoutPath,
    stderrPath,
  };

  if (!allowFailure && result.code !== 0) {
    const error = new Error(`Command failed (${result.code ?? 'null'}): ${command}`);
    error.commandRecord = record;
    throw error;
  }

  return record;
}
