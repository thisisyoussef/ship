import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures/isolated-env'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('#email').fill('dev@ship.local')
  await page.locator('#password').fill('admin123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL('/login', { timeout: 5000 })
}

async function expectDocumentTreesToContainOnlyTreeItems(page: import('@playwright/test').Page) {
  const invalidChildren = await page.locator('[role="tree"][aria-label$="documents"]').evaluateAll((trees) =>
    trees.flatMap((tree) =>
      Array.from(tree.children).flatMap((child) => {
        const text = child.textContent?.trim() ?? ''
        const isEmptyState = text === 'No workspace documents' || text === 'No private documents'

        if (isEmptyState || child.getAttribute('role') === 'treeitem') {
          return []
        }

        return [{
          tag: child.tagName,
          role: child.getAttribute('role'),
          text,
        }]
      })
    )
  )

  expect(invalidChildren).toEqual([])
  await expect(page.locator('[role="tree"] a').filter({ hasText: /more\.\.\./i })).toHaveCount(0)
}

test.describe('Category 7 accessibility regressions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('docs mode keeps overflow links outside document trees', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')

    await expectDocumentTreesToContainOnlyTreeItems(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const treeViolations = results.violations.filter(
      (violation) => violation.id === 'aria-required-children' || violation.id === 'listitem'
    )

    expect(treeViolations).toHaveLength(0)
  })

  test('document detail keeps overflow links outside document trees', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')

    const documentLink = page.locator('aside a[href*="/documents/"]').first()
    await expect(documentLink).toBeVisible({ timeout: 5000 })
    await documentLink.click()
    await page.waitForURL(/\/documents\//)
    await page.waitForLoadState('networkidle')

    await expectDocumentTreesToContainOnlyTreeItems(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const treeViolations = results.violations.filter(
      (violation) => violation.id === 'aria-required-children' || violation.id === 'listitem'
    )

    expect(treeViolations).toHaveLength(0)
  })

  test('my week page has no color-contrast violations', async ({ page }) => {
    await page.goto('/my-week')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ rules: { 'color-contrast': { enabled: true } } })
      .analyze()

    const contrastViolations = results.violations.filter(
      (violation) => violation.id === 'color-contrast'
    )

    expect(contrastViolations).toHaveLength(0)
  })
})
