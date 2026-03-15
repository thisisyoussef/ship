import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { appendMetricArray, login, recordMetric } from './helpers.mjs';

async function expectDocumentTreesToContainOnlyTreeItems(page) {
  const invalidChildren = await page.locator('[role="tree"][aria-label$="documents"]').evaluateAll((trees) =>
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

  expect(invalidChildren).toEqual([]);
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('docs tree keeps overflow controls outside the tree semantics', async ({ page }) => {
  await page.goto('/docs');
  await page.waitForLoadState('networkidle');

  await expectDocumentTreesToContainOnlyTreeItems(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const treeViolations = results.violations.filter(
    (violation) => violation.id === 'aria-required-children' || violation.id === 'listitem'
  );

  recordMetric('docsTreeViolations', treeViolations.length);
  appendMetricArray(
    'docsTreeViolationIds',
    treeViolations.map((violation) => violation.id)
  );
  expect(treeViolations).toHaveLength(0);
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

  recordMetric('myWeekContrastViolations', contrastViolations.length);
  appendMetricArray(
    'myWeekContrastViolationIds',
    contrastViolations.map((violation) => violation.id)
  );
  expect(contrastViolations).toHaveLength(0);
});
