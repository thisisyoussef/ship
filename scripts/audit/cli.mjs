#!/usr/bin/env node
import { resolve } from 'node:path';
import { runComparison } from './lib/run-compare.mjs';

const args = parseArgs(process.argv.slice(2));

const baseline = {};
const submission = {
  dir: process.cwd(),
};

if (args['baseline-dir']) {
  baseline.dir = resolve(args['baseline-dir']);
}
if (args['submission-dir']) {
  submission.dir = resolve(args['submission-dir']);
}
if (args['baseline-repo']) {
  baseline.repoUrl = args['baseline-repo'];
}
if (args['baseline-ref']) {
  baseline.ref = args['baseline-ref'];
}
if (args['submission-repo']) {
  submission.repoUrl = args['submission-repo'];
}
if (args['submission-ref']) {
  submission.ref = args['submission-ref'];
}

const result = await runComparison({
  category: args.category,
  baseline,
  submission,
  outputDir: args['output-dir'],
  databaseUrl: args['database-url'],
});

const selectedCategories = args.category ? [args.category] : Object.keys(result.comparison.categories);
console.log('');
console.log(`Run id: ${result.runId}`);
console.log(`Output dir: ${result.outputDir}`);
console.log(`Dashboard: ${result.dashboardPath}`);
console.log(`Baseline: ${result.baselineSummary.repoUrl}@${result.baselineSummary.ref} (${result.baselineSummary.sha})`);
console.log(`Submission: ${result.submissionSummary.repoUrl}@${result.submissionSummary.ref} (${result.submissionSummary.sha})`);
if (result.submissionSummary.corpus) {
  const corpus = result.submissionSummary.corpus;
  console.log(`Corpus: ${corpus.documents} documents / ${corpus.issues} issues / ${corpus.weeks} weeks / ${corpus.users} users`);
}
console.log('');
for (const categoryId of selectedCategories) {
  const category = result.comparison.categories[categoryId];
  if (!category) {
    continue;
  }
  console.log(`${category.label}: ${category.before} -> ${category.after} ${category.unit} (delta ${category.delta}, ${category.percentChange}%)`);
}
console.log('');
console.log('Easy reproduction recipe:');
console.log(result.recipes.easy);
console.log('');
console.log('Manual reproduction recipe:');
console.log(result.recipes.manual);

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
