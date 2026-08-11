const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8083/(auth)/register', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForTimeout(5000);
  const html = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText, id: b.id, testid: b.getAttribute('testid'), dataTestid: b.getAttribute('data-testid'), className: b.className }));
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({ placeholder: i.placeholder, id: i.id, name: i.name, testid: i.getAttribute('testid'), dataTestid: i.getAttribute('data-testid') }));
    const nodes = Array.from(document.querySelectorAll('*')).filter(el => el.textContent && el.textContent.trim().includes('Create Account')).map(el => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 200), id: el.id, className: el.className }));
    return { buttons, inputs, nodes, title: document.title };
  });
  console.log(JSON.stringify(html, null, 2));
  await browser.close();
})();
