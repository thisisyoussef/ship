import { join } from 'node:path';
import { bytesToKb, gzipSize, listFilesRecursive, readJson } from './fs.mjs';
import { readFile } from 'node:fs/promises';

export async function measureBundleSize({ target, runCommand }) {
  await runCommand(
    `${target.label}-bundle-build`,
    'pnpm --filter @ship/web exec vite build --sourcemap'
  );

  const distDir = join(target.dir, 'web', 'dist');
  const manifestPath = join(distDir, '.vite', 'manifest.json');
  const manifest = await readJson(manifestPath);
  const entry = manifest['index.html'] ?? Object.values(manifest).find((chunk) => chunk.isEntry);

  if (!entry?.file) {
    throw new Error(`Could not resolve the main entry chunk from ${manifestPath}`);
  }

  const entryPath = join(distDir, entry.file);
  const entryBuffer = await readFile(entryPath);
  const files = await listFilesRecursive(distDir);
  const chunkCount = files.filter((file) => file.relativePath.endsWith('.js')).length;
  const totalBundleBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);

  return {
    status: 'passed',
    summaryValue: bytesToKb(entryBuffer.byteLength),
    metrics: {
      mainEntryRawKb: bytesToKb(entryBuffer.byteLength),
      mainEntryGzipKb: await gzipSize(entryPath),
      totalBundleKb: bytesToKb(totalBundleBytes),
      chunkCount,
    },
    entryFile: entry.file,
    files: files.slice(0, 50),
  };
}
