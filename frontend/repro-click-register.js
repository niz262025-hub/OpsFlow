const puppeteer = require('puppeteer');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.stack || err.message));
    page.on('requestfailed', (req) => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));
    await page.goto('http://127.0.0.1:8083/(auth)/register', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('[data-testid="register-submit-button"]', { timeout: 60000 });
    await pause(2000);
    await page.type('[data-testid="register-name-input"]', 'Test User');
    await page.type('[data-testid="register-email-input"]', 'testuser_' + Date.now() + '@example.com');
    await page.type('[data-testid="register-password-input"]', 'password123');
    await page.click('[data-testid="register-submit-button"]');
    await pause(8000);
    console.log('URL:', page.url());
    await browser.close();
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
