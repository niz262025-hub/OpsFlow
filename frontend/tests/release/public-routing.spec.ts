import { expect, test } from '@playwright/test';

test('legacy login with query parameters returns to central MYOPS', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Check outbound routing without contacting production authentication.
  await page.route('https://www.myops.com.my/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Central MYOPS test destination</h1>' }));
  await page.goto('/login?name=%E5%95%86%E5%93%81&empty=&malformed=%E0%A4%A');
  await expect(page).toHaveURL('https://www.myops.com.my/');
  expect(errors).toEqual([]);
});

test('launch without a ticket fails closed on narrow and desktop screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/launch?name=%E5%95%86%E5%93%81&malformed=%E0%A4%A');
  await expect(page.getByText('OpsFlow tak dapat dibuka', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
