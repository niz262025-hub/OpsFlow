const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Local trial provisioning was removed; exercise its replacement SSO boundary.
function service(href, apiOrigin) {
  const replacements = [];
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports, URL, URLSearchParams,
    process: { env: { EXPO_PUBLIC_OPSFLOW_API_URL: apiOrigin } },
    fetch: async (url) => {
      replacements.push(url);
      return { ok: true, json: async () => ({ entitled: true }) };
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
