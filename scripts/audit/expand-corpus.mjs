#!/usr/bin/env node
import { expandCorpus } from './lib/corpus.mjs';

const args = parseArgs(process.argv.slice(2));
const databaseUrl = args['database-url'] || process.env.DATABASE_URL || process.env.RUNNER_DATABASE_URL;

if (!databaseUrl) {
  console.error('database-url or DATABASE_URL is required');
  process.exit(1);
}

const counts = await expandCorpus(databaseUrl);
console.log(JSON.stringify(counts, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
