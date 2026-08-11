import { expect, Locator, Page } from '@playwright/test';

export class CompanySetupPage {
  constructor(private readonly page: Page, private readonly baseUrl: string) {}

  async goto() {
    await this.page.goto(`${this.baseUrl}/(setup)/company-setup`);
  }

  getLogoutControl(): Locator {
    const explicit = this.page.getByTestId('logout-button');
    // Fallback for current app state: logout icon text from MaterialIcons on web.
    const iconFallback = this.page.locator('text=logout').first();
    return explicit.or(iconFallback).first();
  }

  async logout() {
    await this.goto();
    const control = this.getLogoutControl();
    await expect(control).toBeVisible();
    await control.click();
  }
}
