import { test, expect } from '@playwright/test';
import {
  createIsolatedWeekNumber,
  fillWeeklySummaryItem,
  login,
  waitForMyWeekContent,
} from './helpers.mjs';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('ship:disableActionItemsModal', 'true');
  });
  await login(page);
});

async function dismissActionItemsModal(page) {
  const dialog = page.getByRole('dialog', { name: /action items/i });
  if (!(await dialog.isVisible().catch(() => false))) {
    return;
  }

  const closeButton = dialog.getByRole('button', { name: /close|got it/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape');
  }

  await expect(dialog).toBeHidden({ timeout: 10_000 });
}

test('plan edits stay visible on /my-week after navigation', async ({ page }) => {
  const weekNumber = createIsolatedWeekNumber(1);
  await page.goto(`/my-week?week_number=${weekNumber}`);
  await dismissActionItemsModal(page);
  await expect(page.getByRole('heading', { name: `Week ${weekNumber}` })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole('button', { name: /create plan for this week/i }).click();
  await expect(page).toHaveURL(/\/documents\/[a-f0-9-]+/, { timeout: 10_000 });

  await fillWeeklySummaryItem(page, 'Ship the new dashboard feature');
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 });
  await waitForMyWeekContent(page, 'plan', 'Ship the new dashboard feature', weekNumber);

  await page.goBack();
  await dismissActionItemsModal(page);
  await expect(page).toHaveURL(new RegExp(`/my-week\\?week_number=${weekNumber}`), { timeout: 10_000 });
  await expect(page.getByText('Ship the new dashboard feature')).toBeVisible({ timeout: 15_000 });
});

test('retro edits stay visible on /my-week after navigation', async ({ page }) => {
  const weekNumber = createIsolatedWeekNumber(2);
  await page.goto(`/my-week?week_number=${weekNumber}`);
  await dismissActionItemsModal(page);
  await expect(page.getByRole('heading', { name: `Week ${weekNumber}` })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole('button', { name: /create retro for this week/i }).click();
  await expect(page).toHaveURL(/\/documents\/[a-f0-9-]+/, { timeout: 10_000 });

  await fillWeeklySummaryItem(page, 'Completed the API refactoring');
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 });
  await waitForMyWeekContent(page, 'retro', 'Completed the API refactoring', weekNumber);

  await page.goBack();
  await dismissActionItemsModal(page);
  await expect(page).toHaveURL(new RegExp(`/my-week\\?week_number=${weekNumber}`), { timeout: 10_000 });
  await expect(page.getByText('Completed the API refactoring')).toBeVisible({ timeout: 15_000 });
});
