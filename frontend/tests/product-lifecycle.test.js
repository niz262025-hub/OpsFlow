const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
function load(file, imports) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module, exports: module.exports, crypto: webcrypto, require: name => imports[name] });
  return module.exports;
}
function fixture(overrides = {}) {
  const row = { data: { companyId: 'c', status: 'active', stock: 0, reservedStock: 0, name: 'UAT product', ...overrides }, version: 1 };
  let commits = 0;
  const adapter = load('services/documentStore.ts', { './myopsAppAccess': { opsflowRequest: async (_, { action, payload }) => {
    if (action === 'get') return structuredClone(row);
    assert.equal(action, 'commit');
    for (const read of payload.reads) if (row.version !== read.version) throw new Error('Transaction conflict');
    commits++;
    for (const op of payload.operations) { assert.equal(op.kind, 'update'); Object.assign(row.data, op.data); row.version++; }
    return { committed: true };
  } } });
  const lifecycle = load('services/productLifecycle.ts', { './documentStore': adapter });
  return { row, archive: () => lifecycle.setProductArchived({}, 'c', 'p', true), restore: () => lifecycle.setProductArchived({}, 'c', 'p', false), commits: () => commits, validate: lifecycle.assertSellableProduct };
}
test('catalog deletion is reversible and never removes inventory or receipt history', async () => {
  const f = fixture(); const original = structuredClone(f.row.data);
  await f.archive(); assert.deepEqual(f.row.data, { ...original, status: 'archived' });
  await f.restore(); assert.deepEqual(f.row.data, original); assert.equal(f.commits(), 2);
});
for (const fields of [{ stock: 1 }, { reservedStock: 1 }, { stock: NaN }, { companyId: 'other' }]) {
  test(`archive rejects unsafe state ${JSON.stringify(fields)} without writes`, async () => {
    const f = fixture(fields); await assert.rejects(f.archive(), /stock|company/); assert.equal(f.commits(), 0);
  });
}
test('concurrent stock change prevents archival with an optimistic conflict', async () => {
  const f = fixture(); const pending = f.archive(); f.row.version++; f.row.data.stock = 2;
  await assert.rejects(pending, /conflict/); assert.equal(f.commits(), 0); assert.equal(f.row.data.status, 'active');
});
test('stale carts reject archived or foreign-company products before checkout', () => {
  const f = fixture();
  for (const product of [undefined, { companyId: 'c', status: 'archived' }, { companyId: 'other', status: 'active' }]) assert.throws(() => f.validate(product, 'c'), /no longer available/);
  assert.doesNotThrow(() => f.validate(f.row.data, 'c'));
});
