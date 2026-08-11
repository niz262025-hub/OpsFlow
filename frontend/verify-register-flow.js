const puppeteer = require('puppeteer');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    let alertMessage = null;
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });
    page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.stack || err.message));
    await page.goto('http://127.0.0.1:8084/(auth)/register', { waitUntil: 'networkidle2', timeout: 60000 });
    await pause(2000);
    const email = 'testuser+' + Date.now() + '@example.com';
    await page.type('[data-testid="register-name-input"]', 'Test User');
    await page.type('[data-testid="register-email-input"]', email);
    await page.type('[data-testid="register-password-input"]', 'password123');
    await page.click('[data-testid="register-submit-button"]');
    await pause(8000);
    const finalUrl = page.url();
    console.log('ALERT MESSAGE:', alertMessage);
    console.log('FINAL URL:', finalUrl);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
