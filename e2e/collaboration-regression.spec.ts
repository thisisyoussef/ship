import type { Browser, BrowserContext } from '@playwright/test';
import { test, expect, Page } from './fixtures/isolated-env';

type CreateDocumentOptions = {
  title: string;
  content?: {
    type: 'doc';
    content: Array<{
      type: 'paragraph';
      content: Array<{ type: 'text'; text: string }>;
    }>;
  };
};

async function createIsolatedContext(browser: Browser, baseURL: string | undefined): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL });
  await context.addInitScript(() => {
    localStorage.setItem('ship:disableActionItemsModal', 'true');
  });
  return context;
}

async function login(page: Page, email: string, password: string = 'admin123') {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL('/login', { timeout: 10000 });
}

async function getCsrfToken(page: Page): Promise<string> {
  const response = await page.request.get('/api/csrf-token');
  const data = await response.json() as { token: string };
  return data.token;
}

async function createDocument(page: Page, options: CreateDocumentOptions): Promise<{ id: string }> {
  const csrfToken = await getCsrfToken(page);
  const response = await page.request.post('/api/documents', {
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    data: {
      title: options.title,
      document_type: 'wiki',
      visibility: 'workspace',
      content: options.content,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create document: ${response.status()}`);
  }

  return await response.json() as { id: string };
}

async function deleteDocument(page: Page, docId: string) {
  const csrfToken = await getCsrfToken(page);
  await page.request.delete(`/api/documents/${docId}`, {
    headers: { 'x-csrf-token': csrfToken },
  });
}

async function openDocument(page: Page, docId: string) {
  await page.goto(`/documents/${docId}`);
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('sync-status').getByText(/Saved|Cached|Saving|Offline/)).toBeVisible({ timeout: 15000 });
}

async function getEditorText(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const editor = document.querySelector('.ProseMirror');
    if (!editor) return '';

    const clone = editor.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.collaboration-cursor__label, .collaboration-cursor__caret').forEach((element) => {
      element.remove();
    });
    return clone.textContent || '';
  });
}

async function insertTextAtBoundary(page: Page, boundary: 'start' | 'end', text: string) {
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 });

  await page.evaluate((position) => {
    const editor = document.querySelector('.ProseMirror') as HTMLElement | null;
    if (!editor) {
      throw new Error('Editor not found');
    }

    const textWalker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.textContent && node.textContent.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const textNodes: Text[] = [];
    while (textWalker.nextNode()) {
      textNodes.push(textWalker.currentNode as Text);
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Selection not available');
    }

    const range = document.createRange();
    if (textNodes.length === 0) {
      range.selectNodeContents(editor);
      range.collapse(position === 'start');
    } else {
      const targetNode = position === 'start' ? textNodes[0]! : textNodes[textNodes.length - 1]!;
      const offset = position === 'start' ? 0 : targetNode.textContent?.length || 0;
      range.setStart(targetNode, offset);
      range.collapse(true);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
  }, boundary);

  await page.keyboard.insertText(text);
}

test.describe('Collaboration Regression Coverage', () => {
  test('offline edit survives reconnect and syncs to a second collaborator after reload', async ({ browser, baseURL }) => {
    const adminContext = await createIsolatedContext(browser, baseURL);
    const memberContext = await createIsolatedContext(browser, baseURL);
    const adminPage = await adminContext.newPage();
    const memberPage = await memberContext.newPage();

    let documentId: string | null = null;

    try {
      const seedText = `seed-${Date.now()}`;
      const offlineText = `offline-${Date.now()}`;

      await login(adminPage, 'dev@ship.local');
      await login(memberPage, 'bob.martinez@ship.local');

      const document = await createDocument(adminPage, {
        title: `Reconnect Recovery ${Date.now()}`,
      });
      documentId = document.id;

      await openDocument(adminPage, documentId);
      await openDocument(memberPage, documentId);

      await insertTextAtBoundary(adminPage, 'end', seedText);
      await expect(async () => {
        expect(await getEditorText(adminPage)).toContain(seedText);
        expect(await getEditorText(memberPage)).toContain(seedText);
      }).toPass({ timeout: 15000 });

      await adminContext.setOffline(true);
      await expect(adminPage.getByTestId('sync-status')).toContainText('Offline', { timeout: 10000 });

      await insertTextAtBoundary(adminPage, 'end', ` ${offlineText}`);
      await expect(async () => {
        expect(await getEditorText(adminPage)).toContain(offlineText);
      }).toPass({ timeout: 5000 });

      await adminContext.setOffline(false);

      await expect(async () => {
        expect(await getEditorText(memberPage)).toContain(offlineText);
      }).toPass({ timeout: 20000 });

      await adminPage.reload();
      await expect(adminPage.locator('.ProseMirror')).toBeVisible({ timeout: 10000 });

      await expect(async () => {
        expect(await getEditorText(adminPage)).toContain(seedText);
        expect(await getEditorText(adminPage)).toContain(offlineText);
      }).toPass({ timeout: 15000 });
    } finally {
      if (documentId) {
        await deleteDocument(adminPage, documentId).catch(() => undefined);
      }
      await adminContext.close();
      await memberContext.close();
    }
  });

  test('concurrent edits from two users converge without losing either change', async ({ browser, baseURL }) => {
    const adminContext = await createIsolatedContext(browser, baseURL);
    const memberContext = await createIsolatedContext(browser, baseURL);
    const adminPage = await adminContext.newPage();
    const memberPage = await memberContext.newPage();

    let documentId: string | null = null;

    try {
      const baseText = `baseline-${Date.now()}`;
      const adminMarker = `[admin-${Date.now()}]`;
      const memberMarker = `[member-${Date.now()}]`;

      await login(adminPage, 'dev@ship.local');
      await login(memberPage, 'bob.martinez@ship.local');

      const document = await createDocument(adminPage, {
        title: `Concurrent Editing ${Date.now()}`,
      });
      documentId = document.id;

      await openDocument(adminPage, documentId);
      await openDocument(memberPage, documentId);

      await insertTextAtBoundary(adminPage, 'end', baseText);
      await expect(async () => {
        expect(await getEditorText(adminPage)).toContain(baseText);
        expect(await getEditorText(memberPage)).toContain(baseText);
      }).toPass({ timeout: 15000 });

      await Promise.all([
        insertTextAtBoundary(adminPage, 'start', `${adminMarker} `),
        insertTextAtBoundary(memberPage, 'end', ` ${memberMarker}`),
      ]);

      await expect(async () => {
        const adminText = await getEditorText(adminPage);
        const memberText = await getEditorText(memberPage);

        for (const text of [adminText, memberText]) {
          expect(text).toContain(baseText);
          expect(text).toContain(adminMarker);
          expect(text).toContain(memberMarker);
        }
      }).toPass({ timeout: 20000 });

      await adminPage.reload();
      await memberPage.reload();
      await expect(adminPage.locator('.ProseMirror')).toBeVisible({ timeout: 10000 });
      await expect(memberPage.locator('.ProseMirror')).toBeVisible({ timeout: 10000 });

      await expect(async () => {
        const adminText = await getEditorText(adminPage);
        const memberText = await getEditorText(memberPage);

        for (const text of [adminText, memberText]) {
          expect(text).toContain(baseText);
          expect(text).toContain(adminMarker);
          expect(text).toContain(memberMarker);
        }
      }).toPass({ timeout: 20000 });
    } finally {
      if (documentId) {
        await deleteDocument(adminPage, documentId).catch(() => undefined);
      }
      await adminContext.close();
      await memberContext.close();
    }
  });
});
