const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTranslations() {
  const source = fs.readFileSync(path.join(__dirname, '../src/i18n/translations.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const module = { exports: {} };
  const sandbox = { module, exports: module.exports, require, console, Intl, URL, URLSearchParams };
  vm.runInNewContext(compiled.outputText, sandbox);
  return module.exports;
}

test('supported locales resolve to the correct code', () => {
  const { resolveLocale, getTranslation, SUPPORTED_LOCALES } = loadTranslations();
  assert.deepEqual(Array.from(SUPPORTED_LOCALES), ['en', 'ms', 'zh-CN', 'ta']);
  assert.equal(resolveLocale('ms-MY'), 'ms');
  assert.equal(resolveLocale('zh'), 'zh-CN');
  assert.equal(resolveLocale('ta_IN'), 'ta');
  assert.equal(resolveLocale('fr'), 'en');
  assert.equal(getTranslation('ms', 'home.primaryCta'), 'Teruskan dengan MYOPS');
  assert.equal(getTranslation('zh-CN', 'login.back'), '返回 OpsFlow');
});

test('all supported locale dictionaries include the same required keys', () => {
  const { getMissingTranslationKeys } = loadTranslations();
  const missing = getMissingTranslationKeys();
  assert.equal(Object.keys(missing).length, 0);
});
