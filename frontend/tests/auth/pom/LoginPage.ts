import { expect, Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page, private readonly baseUrl: string) {}

  get emailInput() {
    return this.page.getByTestId('login-email-input');
  }

  get passwordInput() {
    return this.page.getByTestId('login-password-input');
  }

  get submitButton() {
    return this.page.getByTestId('login-submit-button');
  }

  async goto() {
    await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const currentUrl = this.page.url();
    if (!currentUrl.includes('/login') && !currentUrl.includes('/(auth)/login')) {
      await this.page.goto(`${this.baseUrl}/(auth)/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    await expect(this.emailInput).toBeVisible({ timeout: 20000 });
    await expect(this.passwordInput).toBeVisible({ timeout: 20000 });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
