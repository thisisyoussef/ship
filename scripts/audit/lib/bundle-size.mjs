import { join } from 'node:path';
import { bytesToKb, gzipSize, listFilesRecursive, readJson } from './fs.mjs';
import { access, readFile } from 'node:fs/promises';

export async function measureBundleSize({ target, runCommand }) {
  await runCommand(
    `${target.label}-bundle-build`,
    'pnpm --filter @ship/web exec vite build --sourcemap'
  );

  const distDir = join(target.dir, 'web', 'dist');
  const { entryFile, entryPath, manifestPath } = await resolveEntryChunk(distDir);
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
    entryFile,
    manifestPath,
    files: files.slice(0, 50),
  };
}

async function resolveEntryChunk(distDir) {
  for (const manifestPath of [join(distDir, '.vite', 'manifest.json'), join(distDir, 'manifest.json')]) {
    if (!(await fileExists(manifestPath))) {
      continue;
    }

    const manifest = await readJson(manifestPath);
    const entry = manifest['index.html'] ?? Object.values(manifest).find((chunk) => chunk.isEntry);
    if (entry?.file) {
      return {
        entryFile: entry.file,
        entryPath: join(distDir, entry.file),
        manifestPath,
      };
    }
  }

  const indexHtmlPath = join(distDir, 'index.html');
  const indexHtml = await readFile(indexHtmlPath, 'utf8');
  const entryMatch =
    indexHtml.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i) ??
    indexHtml.match(/<script[^>]+src="([^"]+index[^"]+\.js)"[^>]*>/i);

  if (!entryMatch?.[1]) {
    throw new Error(`Could not resolve the main entry chunk from ${indexHtmlPath}`);
  }

  const entryFile = entryMatch[1].replace(/^\//, '');
  return {
    entryFile,
    entryPath: join(distDir, entryFile),
    manifestPath: null,
  };
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
