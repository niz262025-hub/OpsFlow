const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Local trial provisioning was removed; exercise its replacement SSO boundary.
function service(href, apiOrigin, payload = { entitled: true }, portalOrigin) {
  const replacements = [];
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports, URL, URLSearchParams,
    process: { env: { EXPO_PUBLIC_OPSFLOW_API_URL: apiOrigin, EXPO_PUBLIC_MYOPS_PORTAL_ORIGIN: portalOrigin } },
    fetch: async (url) => {
      replacements.push(url);
      return { ok: true, json: async () => payload };
    },
    require: () => ({ storage: {} }),
    window: { location: new URL(href), history: { replaceState: (_state, _title, value) => replacements.push(value) } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/myopsAppAccess.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  vm.runInNewContext(compiled.outputText, sandbox);
  return { ...module.exports, replacements };
}

test('launch accepts only well-formed MYOPS tickets', () => {
  const { extractMyopsLaunchTicket: extract } = service('https://opsflow.test/launch');
  const ticket = 'A'.repeat(43);
  assert.equal(extract(`https://opsflow.test/launch#t=${ticket}`), ticket);
  assert.equal(extract(`https://opsflow.test/launch?t=${ticket}`), ticket);
  for (const value of ['bad-url', 'https://opsflow.test/launch#t=short', 'https://opsflow.test/launch']) assert.equal(extract(value), null);
});

test('web refresh uses its own deployment origin without a configured API host', async () => {
  const app = service('https://opsflow-preview.vercel.app/launch');
  assert.equal(await app.refreshMyopsSession('dummy-test-token', false), true);
  assert.deepEqual(app.replacements, ['https://opsflow-preview.vercel.app/api/app-access/refresh']);
});

test('explicit API origins retain HTTPS and credential checks', async () => {
  for (const origin of ['http://remote.test', 'https://name:password@remote.test', 'https://remote.test/path']) {
    const app = service('https://opsflow-preview.vercel.app/launch', origin);
    assert.equal(await app.refreshMyopsSession('dummy-test-token', false), false);
    assert.deepEqual(app.replacements, []);
  }
});

test('clears query and fragment tickets while preserving unrelated query parameters', async () => {
  const ticket = 'A'.repeat(43);
  for (const suffix of [`?view=week&t=${ticket}`, `?view=week#t=${ticket}`, `?view=week&t=${ticket}#t=${ticket}`]) {
    const app = service(`https://opsflow.test/launch${suffix}`);
    await app.clearMyopsLaunchTicketFromUrl();
    assert.deepEqual(app.replacements, ['/launch?view=week']);
  }
});

test('ordinary navigation does not rewrite history', async () => {
  const app = service('https://opsflow.test/app?view=week#section');
  await app.clearMyopsLaunchTicketFromUrl();
  assert.deepEqual(app.replacements, []);
});


test('verified new identity can enter onboarding without a business profile', async () => {
  const app = service('https://opsflow.test/launch', undefined, {access_token:'A'.repeat(64),profile:null,onboarding_required:true});
  const result = await app.redeemMyopsLaunchTicket('T'.repeat(43));
  assert.equal(result.onboardingRequired,true);assert.equal(result.profile,null);
});
test('missing profile without explicit onboarding approval is rejected', async () => {
  const app = service('https://opsflow.test/launch', undefined, {access_token:'A'.repeat(64),profile:null});
  await assert.rejects(app.redeemMyopsLaunchTicket('T'.repeat(43)));
});


test('logout destination keeps staging isolated and production on MYOPS', () => {
  for (const host of ['opsflow-staging.vercel.app','opsflow-staging-eiwcenumi-mohd-syaiful-nizam1.vercel.app','opsflow-staging-git-feat-opsflow-ver-f21c05-mohd-syaiful-nizam1.vercel.app']) {
    assert.equal(service('https://'+host+'/app').myopsPortalUrl(),'https://southerndotcom-website-git-feat-myop-ca0019-mohd-syaiful-nizam1.vercel.app/');
  }
  for (const host of ['flow.myops.com.my','opsflow.myops.com.my','opsflow-staging.vercel.app.attacker.test']) {
    assert.equal(service('https://'+host+'/app').myopsPortalUrl(),'https://www.myops.com.my/');
  }
});


test('production portal override works on Vercel deployment hostnames', () => {
 const origin='https://opsflow-staging-deployment.vercel.app/app';
 assert.equal(service(origin,undefined,{},'https://www.myops.com.my').myopsPortalUrl(),'https://www.myops.com.my/');
 assert.equal(service(origin,undefined,{},'https://attacker.test').myopsPortalUrl(),'https://southerndotcom-website-git-feat-myop-ca0019-mohd-syaiful-nizam1.vercel.app/');
});
