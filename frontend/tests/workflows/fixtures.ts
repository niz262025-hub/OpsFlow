import { Page, test as base } from '@playwright/test';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { WORKFLOW_BASE_URL, WORKFLOW_EMAIL, WORKFLOW_PASSWORD, hasWorkflowCredentials } from './env';

type WorkflowFixtures = {
  appPage: Page;
  jsErrors: string[];
};

function getStoragePath() {
  return path.resolve(__dirname, '../../.playwright-auth.json');
}

async function saveStorageState(page: Page) {
  await page.context().storageState({ path: getStoragePath() });
}

async function waitForWorkflowTarget(page: Page, timeoutMs = 180000) {
  await page.waitForFunction(() => {
    const path = window.location.pathname || '';
    const text = document.body?.innerText || '';
    const debug = (window as any).__BIZFLOW_DEBUG__;
    return Boolean(debug?.uid) || path.includes('/dashboard') || path.includes('/setup') || path.includes('/company-setup') || /create a new business|welcome to bizflow pro|business overview|let's get you set up|join with an invite code/i.test(text);
  }, { timeout: timeoutMs });
}

async function ensureAuthenticatedAndReady(page: Page) {
  const storagePath = getStoragePath();
  const storageState = existsSync(storagePath)
    ? JSON.parse(readFileSync(storagePath, 'utf8'))
    : null;

  const hasPersistedAuth = Boolean(
    storageState &&
    ((storageState.cookies && storageState.cookies.length > 0) ||
      (storageState.origins && storageState.origins.some((item: any) => (item.localStorage?.length || 0) > 0)))
  );

  if (hasPersistedAuth) {
    await page.goto(WORKFLOW_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.context().addInitScript((state) => {
      const storage = state as { cookies?: unknown; origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }> };
      const origin = window.location.origin;
      const match = storage.origins?.find((item) => item.origin === origin);
      if (match?.localStorage) {
        for (const entry of match.localStorage) {
          window.localStorage.setItem(entry.name, entry.value);
        }
      }
    }, storageState);
    await page.goto(WORKFLOW_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForWorkflowTarget(page, 180000);
    await page.goto(`${WORKFLOW_BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForWorkflowTarget(page, 180000);
    await saveStorageState(page);
    return;
  }

  const hasCredentials = hasWorkflowCredentials();

  await page.goto(WORKFLOW_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);

  const loginFormVisible = await page.getByTestId('login-email-input').waitFor({ state: 'visible', timeout: 60000 }).catch(() => undefined);
  if (loginFormVisible || page.url().includes('/(auth)/login') || page.url().includes('/login')) {
    if (await page.getByTestId('login-email-input').isVisible().catch(() => false)) {
      if (hasCredentials) {
        await page.getByTestId('login-email-input').fill(WORKFLOW_EMAIL);
        await page.getByTestId('login-password-input').fill(WORKFLOW_PASSWORD);
        await page.getByTestId('login-submit-button').click({ force: true });
      } else {
        const ts = Date.now();
        const email = `bizflow-workflow-${ts}@example.com`;
        const password = 'TestPass123!';
        await page.getByText('Create Account').click().catch(() => page.getByTestId('go-to-register-button').click());
        await page.getByTestId('register-name-input').fill('Workflow E2E');
        await page.getByTestId('register-email-input').fill(email);
        await page.getByTestId('register-password-input').fill(password);
        await page.getByTestId('register-submit-button').click();
      }
    }
  }

  await waitForWorkflowTarget(page, 180000);

  const authDebug = await page.evaluate(() => ({
    uid: (window as any).__BIZFLOW_DEBUG__?.uid ?? null,
    companyId: (window as any).__BIZFLOW_DEBUG__?.companyId ?? null,
    pathname: window.location.pathname,
  }));
  console.log('[workflow] auth snapshot', authDebug);

  const currentUrl = page.url();
  const isCompanySetup = /\/company-setup|\(setup\)\/company-setup/.test(currentUrl);

  if (isCompanySetup) {
    const createCard = page.getByText('Create a New Business');
    if (await createCard.isVisible().catch(() => false)) {
      await createCard.click({ force: true });
      await page.getByTestId('setup-company-name-input').waitFor({ state: 'visible', timeout: 60000 });
      await page.getByTestId('setup-company-name-input').fill(`E2E Biz ${Date.now()}`);
      await page.getByTestId('setup-next-button').click({ force: true });
      await page.getByTestId('setup-owner-input').waitFor({ state: 'visible', timeout: 60000 });
      await page.getByTestId('setup-owner-input').fill('E2E Owner');
      await page.getByTestId('setup-next-button').click({ force: true });
      await page.getByTestId('setup-phone-input').waitFor({ state: 'visible', timeout: 60000 });
      await page.getByTestId('setup-phone-input').fill('0123456789');
      await page.getByTestId('setup-finish-button').click({ force: true });
      await page.waitForTimeout(5000);
      await waitForWorkflowTarget(page, 120000);
    }
  }

  await page.goto(`${WORKFLOW_BASE_URL}/setup`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitForWorkflowTarget(page, 180000);
  await saveStorageState(page);
}

export const test = base.extend<WorkflowFixtures>({
  jsErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await use(errors);
  },

  appPage: async ({ page }, use) => {
    await ensureAuthenticatedAndReady(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
