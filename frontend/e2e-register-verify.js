const puppeteer = require('puppeteer');
const { writeFileSync } = require('fs');

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const publicUrl = 'https://vigilant-space-broccoli-4qgww9v66rq427j4r-8084.app.github.dev';
const apiKey = 'AIzaSyDw4WrwxMvNLUGquFwoK7MksTjWCRtLeAA';
const projectId = 'bizflow-91aef';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  const errors = [];
  const consoleErrors = [];
  const networkEvents = [];
  let signUpSuccess = false;
  let firestoreWriteSuccess = false;
  let accountUpdateSuccess = false;
  let lookupSuccess = false;

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    console.log('BROWSER CONSOLE:', msg.type(), msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.log('PAGE ERROR:', err.message);
  });
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    if (url.includes('accounts:signUp')) {
      networkEvents.push({ type: 'signUp', status, url });
      signUpSuccess = status === 200;
    }
    if (url.includes('accounts:update')) {
      networkEvents.push({ type: 'updateProfile', status, url });
      accountUpdateSuccess = status === 200;
    }
    if (url.includes('accounts:lookup')) {
      networkEvents.push({ type: 'lookup', status, url });
      lookupSuccess = status === 200;
    }
    if (url.includes('google.firestore.v1.Firestore/Write/channel')) {
      networkEvents.push({ type: 'firestoreWrite', status, url });
      firestoreWriteSuccess = status === 200;
    }
  });

  try {
    console.log('Visiting public app root...');
    await page.goto(publicUrl, { waitUntil: 'networkidle2' });
    await pause(2500);

    let loginPageLoaded = false;
    try {
      await page.waitForSelector('[data-testid="login-email-input"]', { timeout: 20000 });
      await page.waitForSelector('[data-testid="login-password-input"]', { timeout: 20000 });
      loginPageLoaded = true;
    } catch {
      // fallback to direct login route
      await page.goto(`${publicUrl}/(auth)/login`, { waitUntil: 'networkidle2' });
      await pause(2000);
      loginPageLoaded = !!(await page.$('[data-testid="login-email-input"]')) && !!(await page.$('[data-testid="login-password-input"]'));
    }

    console.log('Login page loaded:', loginPageLoaded);
    if (!loginPageLoaded) throw new Error('Login page did not render correctly.');

    const goToRegister = await page.$('[data-testid="go-to-register-button"]') || await page.$('[testid="go-to-register-button"]');
    if (goToRegister) {
      await goToRegister.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    } else {
      await page.goto(`${publicUrl}/(auth)/register`, { waitUntil: 'networkidle2' });
    }

    await pause(1500);

    const registerLoaded = !!(await page.$('[data-testid="register-name-input"]')) && !!(await page.$('[data-testid="register-email-input"]')) && !!(await page.$('[data-testid="register-password-input"]')) && !!(await page.$('[data-testid="register-submit-button"]'));
    console.log('Register page loaded:', registerLoaded);
    if (!registerLoaded) throw new Error('Register page did not render correctly.');

    const testEmail = `testuser+${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const testName = 'Test User';

    await page.type('[data-testid="register-name-input"]', testName);
    await page.type('[data-testid="register-email-input"]', testEmail);
    await page.type('[data-testid="register-password-input"]', testPassword);
    await pause(500);

    const submitButton = await page.$('[data-testid="register-submit-button"]') || await page.$('[testid="register-submit-button"]');
    if (!submitButton) throw new Error('Register submit button not found.');
    await submitButton.click();

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await pause(5000);

    const finalUrl = await page.url();
    console.log('Final URL after registration:', finalUrl);

    const pageTitle = await page.title();
    console.log('Page title after registration:', pageTitle);

    const companySetupVisible = !!(await page.$('[data-testid="setup-company-name-input"]')) || !!(await page.$('[data-testid="setup-next-button"]'));
    const dashboardVisible = !!(await page.$('[data-testid="add-expense-button"]')) || !!(await page.$('[data-testid="new-purchase-button"]'));

    console.log('Company setup visible:', companySetupVisible);
    console.log('Dashboard visible:', dashboardVisible);

    const authConfirmed = signUpSuccess;
    const firestoreConfirmed = firestoreWriteSuccess;

    if (!authConfirmed) throw new Error('Firebase Authentication sign-up was not confirmed by network requests.');
    if (!firestoreConfirmed) throw new Error('Firestore write was not observed after registration.');

    console.log('Auth and Firestore persistence observed successfully.');

    const signInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, returnSecureToken: true }),
    });
    const signInResult = await signInResponse.json();
    const authOk = signInResponse.status === 200 && signInResult.localId && signInResult.idToken;
    console.log('Firebase auth sign-in status:', signInResponse.status, authOk ? 'OK' : JSON.stringify(signInResult));

    if (!authOk) throw new Error('Could not sign in with registered credentials via Firebase REST API.');

    const uid = signInResult.localId;
    const docResp = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`, {
      headers: { Authorization: `Bearer ${signInResult.idToken}` },
    });
    const docBody = await docResp.json();
    const firestoreDocOk = docResp.status === 200 && docBody.name && docBody.fields;
    console.log('Firestore user doc read status:', docResp.status, firestoreDocOk ? 'OK' : JSON.stringify(docBody));

    if (!firestoreDocOk) throw new Error('Could not read Firestore user document after registration.');

    console.log('=== SUMMARY ===');
    console.log('Public URL reachable:', publicUrl);
    console.log('Login page loaded:', loginPageLoaded);
    console.log('Registered user:', testEmail);
    console.log('Firebase Auth created user:', authOk);
    console.log('Firestore user document exists:', firestoreDocOk);
    console.log('Final route after registration:', finalUrl);
    console.log('Page navigated to company setup:', companySetupVisible);
    console.log('Page navigated to dashboard:', dashboardVisible);
    console.log('Frontend errors:', errors.length ? errors : 'none');
    console.log('Console errors:', consoleErrors.length ? consoleErrors : 'none');
    console.log('Network events:', networkEvents.map((e) => ({ type: e.type, status: e.status, url: e.url })).slice(-10));

    await browser.close();
    if (errors.length || consoleErrors.length) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('TEST ERROR:', err.message || err);
    await browser.close().catch(() => {});
    process.exit(1);
  }
})();
