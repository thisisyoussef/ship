import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { appendLog, appendMetricArray, login, recordMetric } from './helpers.mjs';

async function collectDocumentTreeStructuralIssues(page) {
  return page.locator('[role="tree"][aria-label$="documents"]').evaluateAll((trees) =>
    trees.flatMap((tree) =>
      Array.from(tree.children).flatMap((child) => {
        const text = child.textContent?.trim() ?? '';
        const isEmptyState = text === 'No workspace documents' || text === 'No private documents';
        if (isEmptyState || child.getAttribute('role') === 'treeitem') {
          return [];
        }
        return [{ tag: child.tagName, role: child.getAttribute('role'), text }];
      })
    )
  );
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('docs tree keeps overflow controls outside the tree semantics', async ({ page }) => {
  await page.goto('/docs');
  await page.waitForLoadState('networkidle');

  const invalidChildren = await collectDocumentTreeStructuralIssues(page);
  recordMetric('docsTreeStructureIssues', invalidChildren.length);
  appendMetricArray('docsTreeInvalidChildren', invalidChildren);
  appendLog(`docs tree structural issues: ${invalidChildren.length}`);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const treeViolations = results.violations.filter(
    (violation) => violation.id === 'aria-required-children' || violation.id === 'listitem'
  );
  const docsTreeViolationNodes = treeViolations.reduce(
    (count, violation) => count + violation.nodes.length,
    0
  );
  const docsTreeTotalAxeViolations = results.violations.reduce(
    (count, violation) => count + violation.nodes.length,
    0
  );

  recordMetric('docsTreeViolations', docsTreeViolationNodes);
  recordMetric('docsTreeRuleViolations', treeViolations.length);
  recordMetric('docsTreeTotalAxeViolations', docsTreeTotalAxeViolations);
  appendMetricArray(
    'docsTreeViolationIds',
    treeViolations.map((violation) => violation.id)
  );
  appendLog(
    `docs tree axe violations: ${treeViolations.length} rules / ${docsTreeViolationNodes} impacted nodes`
  );

  expect.soft(
    invalidChildren,
    'Docs tree should contain only treeitem children or empty-state placeholders.'
  ).toEqual([]);
  expect.soft(
    treeViolations,
    'Docs tree should stay free of aria-required-children and listitem axe violations.'
  ).toHaveLength(0);
});

test('my week stays free of color contrast violations', async ({ page }) => {
  await page.goto('/my-week');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .options({ rules: { 'color-contrast': { enabled: true } } })
    .analyze();

  const contrastViolations = results.violations.filter(
    (violation) => violation.id === 'color-contrast'
  );
  const contrastViolationNodes = contrastViolations.reduce(
    (count, violation) => count + violation.nodes.length,
    0
  );

  recordMetric('myWeekContrastViolations', contrastViolationNodes);
  recordMetric('myWeekContrastRuleViolations', contrastViolations.length);
  appendMetricArray(
    'myWeekContrastViolationIds',
    contrastViolations.map((violation) => violation.id)
  );
  appendLog(
    `my-week contrast violations: ${contrastViolations.length} rules / ${contrastViolationNodes} impacted nodes`
  );

  expect.soft(
    contrastViolations,
    'My Week should stay free of color-contrast axe violations.'
  ).toHaveLength(0);
});
