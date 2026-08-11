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
    await page.waitForSelector('body', { timeout: 60000 });
    await pause(2000);
    const dom = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText, testid: b.getAttribute('testid'), dataTestid: b.getAttribute('data-testid'), className: b.className }));
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ placeholder: i.placeholder, testid: i.getAttribute('testid'), dataTestid: i.getAttribute('data-testid'), name: i.name, id: i.id }));
      const customIds = Array.from(document.querySelectorAll('[testid], [data-testid]')).map(el => ({ tag: el.tagName, testid: el.getAttribute('testid'), dataTestid: el.getAttribute('data-testid'), text: el.textContent?.trim().slice(0, 100) }));
      return { buttons, inputs, customIds, title: document.title, url: window.location.href };
    });
    console.log('DOM INSPECT:', JSON.stringify(dom, null, 2));
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
