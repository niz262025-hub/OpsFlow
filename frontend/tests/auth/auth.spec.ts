import { expect, test } from '@playwright/test';
import { AUTH_E2E_BASE_URL, AUTH_E2E_EMAIL, AUTH_E2E_PASSWORD, hasValidAuthCredentials } from './auth.env';
import { CompanySetupPage } from './pom/CompanySetupPage';
import { LoginPage } from './pom/LoginPage';

test.describe('Authentication E2E', () => {
  test('login with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page, AUTH_E2E_BASE_URL);
    await loginPage.goto();

    const dialogPromise = page.waitForEvent('dialog', { timeout: 12000 }).catch(() => null);
    await loginPage.login('invalid.user@example.com', 'WrongPass123!');

    const dialog = await dialogPromise;
    if (dialog) {
      expect(dialog.message()).toContain('Invalid email or password');
      await dialog.accept();
    }

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(page).toHaveURL(/\/login(?:\/)?$/);
  });

  test('empty email validation', async ({ page }) => {
    const loginPage = new LoginPage(page, AUTH_E2E_BASE_URL);
    await loginPage.goto();

    await loginPage.passwordInput.fill('SomePassword123!');
    await loginPage.submitButton.click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page).toHaveURL(/\/login(?:\/)?$/);
  });

  test('empty password validation', async ({ page }) => {
    const loginPage = new LoginPage(page, AUTH_E2E_BASE_URL);
    await loginPage.goto();

    await loginPage.emailInput.fill('valid.format@example.com');
    await loginPage.submitButton.click();

    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page).toHaveURL(/\/login(?:\/)?$/);
  });

  test('protected routes: unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto(`${AUTH_E2E_BASE_URL}/(tabs)/dashboard`);

    // App-level auth guard should keep anonymous users out of protected areas.
    await expect(page).toHaveURL(/\/login(?:\/)?$/);
    await expect(page.getByTestId('login-email-input')).toBeVisible();
  });

  test('login with valid credentials', async ({ page }) => {
    test.skip(!hasValidAuthCredentials(), 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run valid-auth tests');
    const loginPage = new LoginPage(page, AUTH_E2E_BASE_URL);
    await loginPage.goto();

    await loginPage.login(AUTH_E2E_EMAIL, AUTH_E2E_PASSWORD);

    await expect(page).toHaveURL(/\(setup\)\/company-setup|\(tabs\)\/dashboard/, { timeout: 25000 });
    await expect(loginPage.submitButton).not.toBeVisible();
  });

  test('redirect after successful login', async ({ page }) => {
    test.skip(!hasValidAuthCredentials(), 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run valid-auth tests');
    const loginPage = new LoginPage(page, AUTH_E2E_BASE_URL);
    await loginPage.goto();

    await loginPage.login(AUTH_E2E_EMAIL, AUTH_E2E_PASSWORD);

    await expect(page).toHaveURL(/\(setup\)\/company-setup|\(tabs\)\/dashboard/, { timeout: 25000 });
  });

  test('session persistence after reload', async ({ page }) => {
    test.skip(!hasValidAuthCredentials(), 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run valid-auth tests');
    const loginPage = new LoginPage(page, AUTH_E2E_BASE_URL);
    await loginPage.goto();

    await loginPage.login(AUTH_E2E_EMAIL, AUTH_E2E_PASSWORD);
    await expect(page).toHaveURL(/\(setup\)\/company-setup|\(tabs\)\/dashboard/, { timeout: 25000 });

    await page.reload();

    await expect(page).toHaveURL(/\(setup\)\/company-setup|\(tabs\)\/dashboard/, { timeout: 25000 });
    await expect(page.getByTestId('login-submit-button')).not.toBeVisible();
  });

  test('logout', async ({ page }) => {
    test.skip(!hasValidAuthCredentials(), 'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run valid-auth tests');
    const loginPage = new LoginPage(page, AUTH_E2E_BASE_URL);
    await loginPage.goto();

    await loginPage.login(AUTH_E2E_EMAIL, AUTH_E2E_PASSWORD);
    await expect(page).toHaveURL(/\(setup\)\/company-setup|\(tabs\)\/dashboard/, { timeout: 25000 });

    const companySetupPage = new CompanySetupPage(page, AUTH_E2E_BASE_URL);
    await companySetupPage.logout();

    await expect(page).toHaveURL(/\/login(?:\/)?$/, { timeout: 20000 });
    await expect(loginPage.submitButton).toBeVisible();
  });
});
