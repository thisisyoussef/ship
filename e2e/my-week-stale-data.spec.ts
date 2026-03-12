import { test, expect } from './fixtures/isolated-env'

/**
 * Tests that /my-week reflects plan/retro edits after navigating back.
 *
 * Bug: The my-week query had a 5-minute staleTime and content edits go through
 * Yjs WebSocket (no client-side mutation), so navigating back showed stale data.
 * Fix: staleTime set to 0 so every mount refetches fresh data from the API.
 *
 * Flake fix: wait for the dashboard API to reflect the persisted Yjs content
 * instead of relying on a fixed sleep after the editor shows "Saved".
 */

async function waitForMyWeekContent(
  page: import('@playwright/test').Page,
  kind: 'plan' | 'retro',
  expectedText: string,
  weekNumber?: number
) {
  await expect.poll(async () => {
    const suffix = weekNumber ? `?week_number=${weekNumber}` : ''
    const response = await page.request.get(`/api/dashboard/my-week${suffix}`)
    if (!response.ok()) {
      return ''
    }

    const data = await response.json()
    const items = kind === 'plan'
      ? (data.plan?.items ?? [])
      : (data.retro?.items ?? [])

    return items.map((item: { text: string }) => item.text).join('\n')
  }, {
    timeout: 20000,
    message: `waiting for persisted ${kind} content to appear in /api/dashboard/my-week`,
  }).toContain(expectedText)
}

function createIsolatedWeekNumber(offset: number) {
  return 50_000 + (Math.floor(Date.now() / 1000) % 10_000) + offset
}

async function fillWeeklySummaryItem(
  page: import('@playwright/test').Page,
  text: string
) {
  const editor = page.locator('.ProseMirror')
  await expect(editor).toBeVisible({ timeout: 10000 })

  await editor.click()
  await page.keyboard.type(`- ${text}`)

  await expect(editor).toContainText(text)
}

test.describe('My Week - stale data after editing plan/retro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('dev@ship.local')
    await page.locator('#password').fill('admin123')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).not.toHaveURL('/login', { timeout: 5000 })
  })

  test('plan edits are visible on /my-week after navigating back', async ({ page }) => {
    const weekNumber = createIsolatedWeekNumber(1)

    // 1. Navigate to /my-week
    await page.goto(`/my-week?week_number=${weekNumber}`)
    await expect(page.getByRole('heading', { name: /^Week \d+$/ })).toBeVisible({ timeout: 10000 })

    // 2. Create a plan (click the create button)
    await page.getByRole('button', { name: /create plan for this week/i }).click()

    // 3. Should navigate to the document editor
    await expect(page).toHaveURL(/\/documents\/[a-f0-9-]+/, { timeout: 10000 })

    // 4. Fill the first template list item so the dashboard summary parser sees it.
    await fillWeeklySummaryItem(page, 'Ship the new dashboard feature')

    // 5. Wait for the collaboration server to persist the content
    // "Saved" means WebSocket synced locally, but the dashboard reads the DB backup.
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10000 })
    await waitForMyWeekContent(page, 'plan', 'Ship the new dashboard feature', weekNumber)

    // 6. Navigate back to the same week using browser history.
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/my-week\\?week_number=${weekNumber}`), { timeout: 10000 })
    await expect(page.getByRole('heading', { name: `Week ${weekNumber}` })).toBeVisible({ timeout: 10000 })

    // 7. Verify the plan content is visible on the my-week page
    // The dashboard now refetches on mount; this asserts the persisted item
    // survives navigation back into the API-backed summary view.
    await expect(page.getByText('Ship the new dashboard feature')).toBeVisible({ timeout: 15000 })
  })

  test('retro edits are visible on /my-week after navigating back', async ({ page }) => {
    const weekNumber = createIsolatedWeekNumber(2)

    // 1. Navigate to /my-week
    await page.goto(`/my-week?week_number=${weekNumber}`)
    await expect(page.getByRole('heading', { name: /^Week \d+$/ })).toBeVisible({ timeout: 10000 })

    // 2. Create a retro (click the main create button, not the nudge link)
    await page.getByRole('button', { name: /create retro for this week/i }).click()

    // 3. Should navigate to the document editor
    await expect(page).toHaveURL(/\/documents\/[a-f0-9-]+/, { timeout: 10000 })

    // 4. Fill the first retro list item so the dashboard summary parser sees it.
    await fillWeeklySummaryItem(page, 'Completed the API refactoring')

    // 5. Wait for the collaboration server to persist the content
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10000 })
    await waitForMyWeekContent(page, 'retro', 'Completed the API refactoring', weekNumber)

    // 6. Navigate back to the same week using browser history.
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/my-week\\?week_number=${weekNumber}`), { timeout: 10000 })
    await expect(page.getByRole('heading', { name: `Week ${weekNumber}` })).toBeVisible({ timeout: 10000 })

    // 7. Verify the retro content is visible on the my-week page
    await expect(page.getByText('Completed the API refactoring')).toBeVisible({ timeout: 15000 })
  })
})
