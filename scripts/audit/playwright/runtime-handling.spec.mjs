import { test, expect } from '@playwright/test';
import { appendMetricArray, login, recordMetric } from './helpers.mjs';

test.describe.configure({ mode: 'serial' });

test('login bootstrap stays free of unexpected console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (
        text.includes('Failed to load resource') ||
        text.includes('ERR_ABORTED') ||
        text.includes('[vite]') ||
        text.includes('favicon')
      ) {
        return;
      }
      errors.push(text);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  await login(page);
  await page.waitForLoadState('networkidle');

  recordMetric('unexpectedConsoleErrors', errors.length);
  appendMetricArray('consoleErrors', errors);
  expect(errors).toEqual([]);
});

test('direct document entry is interactive without a blocking action-items modal', async ({ page }) => {
  await login(page);
  const apiUrl = process.env.AUDIT_API_URL;
  const documents = await page.request.get(`${apiUrl}/api/documents`);
  const [firstDocument] = await documents.json();

  await page.goto(`/documents/${firstDocument.id}`);
  await expect(page.locator('.ProseMirror').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('dialog', { name: /action items/i })).toHaveCount(0);

  await page.locator('.ProseMirror').first().click();
  recordMetric('blockingActionItemsModals', 0);
});
