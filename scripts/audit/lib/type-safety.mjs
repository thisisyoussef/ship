import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import ts from 'typescript';

const SOURCE_ROOTS = ['api', 'web', 'shared'];
const DIRECTIVE_PATTERN = /@ts-ignore|@ts-expect-error/g;

export async function measureTypeSafety({ target, runCommand }) {
  await runCommand(`${target.label}-type-shared`, 'pnpm --filter @ship/shared type-check');
  await runCommand(`${target.label}-type-api`, 'pnpm --filter @ship/api type-check');
  await runCommand(`${target.label}-type-web`, 'pnpm --filter @ship/web exec tsc --noEmit');

  const files = [];
  for (const root of SOURCE_ROOTS) {
    await walkTypeScript(join(target.dir, root), files);
  }

  const packageBreakdown = {
    api: createZeroBreakdown(),
    web: createZeroBreakdown(),
    shared: createZeroBreakdown(),
  };
  const fileBreakdown = [];

  for (const filePath of files) {
    const sourceText = await readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
    const counts = createZeroBreakdown();
    walkNode(sourceFile, counts);
    counts.directiveCount = (sourceText.match(DIRECTIVE_PATTERN) ?? []).length;
    counts.totalViolations =
      counts.anyCount + counts.asCount + counts.nonNullCount + counts.directiveCount;

    const packageName = relative(target.dir, filePath).split('/')[0];
    addBreakdown(packageBreakdown[packageName], counts);

    if (counts.totalViolations > 0) {
      fileBreakdown.push({
        path: relative(target.dir, filePath),
        ...counts,
      });
    }
  }

  fileBreakdown.sort((left, right) => right.totalViolations - left.totalViolations);

  const totals = Object.values(packageBreakdown).reduce(
    (accumulator, current) => addBreakdown(accumulator, current),
    createZeroBreakdown()
  );

  return {
    status: 'passed',
    summaryValue: totals.totalViolations,
    metrics: {
      totalViolations: totals.totalViolations,
      anyCount: totals.anyCount,
      asCount: totals.asCount,
      nonNullCount: totals.nonNullCount,
      directiveCount: totals.directiveCount,
    },
    packageBreakdown,
    topFiles: fileBreakdown.slice(0, 10),
  };
}

function createZeroBreakdown() {
  return {
    anyCount: 0,
    asCount: 0,
    nonNullCount: 0,
    directiveCount: 0,
    totalViolations: 0,
  };
}

function addBreakdown(target, source) {
  target.anyCount += source.anyCount;
  target.asCount += source.asCount;
  target.nonNullCount += source.nonNullCount;
  target.directiveCount += source.directiveCount;
  target.totalViolations += source.totalViolations;
  return target;
}

function walkNode(node, counts) {
  if (node.kind === ts.SyntaxKind.AnyKeyword) {
    counts.anyCount += 1;
  } else if (node.kind === ts.SyntaxKind.AsExpression) {
    counts.asCount += 1;
  } else if (node.kind === ts.SyntaxKind.NonNullExpression) {
    counts.nonNullCount += 1;
  }

  ts.forEachChild(node, (child) => walkNode(child, counts));
}

async function walkTypeScript(dir, files) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules') {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkTypeScript(fullPath, files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
      continue;
    }
    const fileStat = await stat(fullPath);
    if (fileStat.size > 0) {
      files.push(fullPath);
    }
  }
}
