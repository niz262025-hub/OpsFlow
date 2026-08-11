const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => console.log('FAILED REQUEST:', req.method(), req.url(), req.failure()?.errorText));
  await page.goto('http://127.0.0.1:8083');
  await page.waitForTimeout(3000);
  await page.goto('http://127.0.0.1:8083/(auth)/register');
  await page.waitForTimeout(4000);
  await page.fill('[testid="register-name-input"]', 'Test User');
  await page.fill('[testid="register-email-input"]', 'testuser@example.com');
  await page.fill('[testid="register-password-input"]', 'password123');
  await page.click('[testid="register-submit-button"]');
  await page.waitForTimeout(6000);
  console.log('URL:', page.url());
  await browser.close();
})();
