import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export async function login(page) {
  await page.goto('/login');
  await page.locator('#email').fill('dev@ship.local');
  await page.locator('#password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 10_000 });
}

export async function waitForMyWeekContent(page, kind, expectedText, weekNumber) {
  const apiBaseUrl = process.env.AUDIT_API_URL;
  await page.waitForFunction(
    async ({ apiBaseUrl: currentApiBaseUrl, currentKind, currentExpectedText, currentWeekNumber }) => {
      const suffix = currentWeekNumber ? `?week_number=${currentWeekNumber}` : '';
      const response = await fetch(`${currentApiBaseUrl}/api/dashboard/my-week${suffix}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      const items = currentKind === 'plan'
        ? (data.plan?.items ?? [])
        : (data.retro?.items ?? []);
      const joined = items.map((item) => item.text).join('\n');
      return joined.includes(currentExpectedText);
    },
    {
      apiBaseUrl,
      currentKind: kind,
      currentExpectedText: expectedText,
      currentWeekNumber: weekNumber,
    },
    { timeout: 20_000 }
  );
}

export async function fillWeeklySummaryItem(page, text) {
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type(`- ${text}`);
  await page.getByText(text).waitFor({ state: 'visible', timeout: 10_000 });
}

export function createIsolatedWeekNumber(offset) {
  return 50_000 + (Math.floor(Date.now() / 1000) % 10_000) + offset;
}

export function recordMetric(name, value) {
  const metricsFile = process.env.AUDIT_METRICS_FILE;
  if (!metricsFile) {
    return;
  }

  const current = existsSync(metricsFile)
    ? JSON.parse(readFileSync(metricsFile, 'utf8'))
    : {};
  current[name] = value;
  mkdirSync(dirname(metricsFile), { recursive: true });
  writeFileSync(metricsFile, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
}

export function appendMetricArray(name, value) {
  const metricsFile = process.env.AUDIT_METRICS_FILE;
  if (!metricsFile) {
    return;
  }

  const current = existsSync(metricsFile)
    ? JSON.parse(readFileSync(metricsFile, 'utf8'))
    : {};
  const list = Array.isArray(current[name]) ? current[name] : [];
  list.push(value);
  current[name] = list;
  mkdirSync(dirname(metricsFile), { recursive: true });
  writeFileSync(metricsFile, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
}

export function appendLog(message) {
  const logFile = process.env.AUDIT_SPEC_LOG_FILE;
  if (!logFile) {
    return;
  }
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, `${message}\n`);
}
