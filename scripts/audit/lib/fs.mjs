import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
  return path;
}

export async function writeJson(path, value) {
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function writeText(path, value) {
  await ensureDir(dirname(path));
  await writeFile(path, value, 'utf8');
}

export async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

export function bytesToKb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

export async function gzipSize(path) {
  const buffer = await readFile(path);
  return bytesToKb(gzipSync(buffer).byteLength);
}

export function sanitizeName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'item';
}

export function shortHash(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 8);
}

export async function listFilesRecursive(rootDir) {
  const entries = [];

  async function walk(currentDir) {
    const dirEntries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of dirEntries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const fileStat = await stat(fullPath);
        entries.push({
          absolutePath: fullPath,
          relativePath: relative(rootDir, fullPath),
          sizeBytes: fileStat.size,
        });
      }
    }
  }

  await walk(rootDir);
  entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return entries;
}
