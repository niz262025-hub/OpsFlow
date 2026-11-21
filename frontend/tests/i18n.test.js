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

function loadWorkflows(){
 const module={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'../src/i18n/workflows.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});
 return module.exports;
}
test('retail workflows translate in all four languages while entered data remains unchanged',()=>{
 const {workflowText,workflowTranslations}=loadWorkflows();
 assert.equal(workflowText('ms','Checkout'),'Bayar');
 assert.equal(workflowText('zh-CN','Inventory'),'库存');
 assert.equal(workflowText('ta','Suppliers'),'வழங்குநர்கள்');
 for(const [key,values] of Object.entries(workflowTranslations))for(const locale of ['en','ms','zh-CN','ta'])assert.ok(values[locale],key+':'+locale);
 assert.equal(workflowText('ms','Customer supplied name 123'),'Customer supplied name 123');
});
test('all fixed copy used by the customer screens has four-language coverage',()=>{
 const {workflowTranslations}=loadWorkflows();
 for(const name of fs.readdirSync(path.join(__dirname,'../app/app')).filter(x=>x.endsWith('.tsx'))){
  const source=fs.readFileSync(path.join(__dirname,'../app/app',name),'utf8');
  const ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function walk(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='tx'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))assert.ok(workflowTranslations[n.arguments[0].text],name+':'+n.arguments[0].text);ts.forEachChild(n,walk);}walk(ast);
 }
});
