import { expect, Locator, Page } from '@playwright/test';

export class CompanySetupPage {
  constructor(private readonly page: Page, private readonly baseUrl: string) {}

  async goto() {
    await this.page.goto(`${this.baseUrl}/(setup)/company-setup`);
  }

  getMyopsBackControl(): Locator {
    const explicit = this.page.getByTestId('back-to-myops-button');
    const textFallback = this.page.locator('text=Back to MYOPS').first();
    return explicit.or(textFallback).first();
  }

  async openMyops() {
    await this.goto();
    const control = this.getMyopsBackControl();
    await expect(control).toBeVisible();
    await control.click();
  }
}
