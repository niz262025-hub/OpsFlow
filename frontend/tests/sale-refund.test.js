const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const path = require('node:path');
function load(file, imports) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module, exports: module.exports, crypto: webcrypto, require: name => imports[name] });
  return module.exports;
}
function fixture(overrides = {}) {
  const docs = new Map(Object.entries({
    'sales/s': { companyId: 'c', saleNumber: 'S1', paymentMethod: 'Cash', items: [{ productId: 'p', quantity: 2 }], total: 21.2, ...overrides },
    'products/p': { companyId: 'c', name: 'Test', stock: 8 },
    'bank_accounts/b': { companyId: 'c' },
  }).map(([key, data]) => [key, { data, version: 1 }]));
  let commits = 0;
  const adapter = load('services/documentStore.ts', { './myopsAppAccess': { opsflowRequest: async (_, { action, payload }) => {
    if (action === 'get') return structuredClone(docs.get(payload.path) || null);
    assert.equal(action, 'commit');
    // Simulate the gateway's optimistic transaction conflict check before any mutation.
    for (const read of payload.reads) if ((docs.get(`${read.collection}/${read.id}`)?.version || 0) !== read.version) throw new Error('Transaction conflict');
    commits++;
    for (const op of payload.operations) {
      const prior = docs.get(op.path);
      docs.set(op.path, { data: structuredClone(op.kind === 'update' ? { ...prior.data, ...op.data } : op.data), version: (prior?.version || 0) + 1 });
    }
    return { committed: true };
  } } });
  const refund = load('services/saleRefund.ts', { './documentStore': adapter }).recordSaleRefund;
  return { docs, refund: (reason = 'UAT full return') => refund({}, 'c', 'manager', 's', reason), commits: () => commits };
}
test('cash return restores stock, retains sale and reverses exact payment in one commit', async () => {
  const f = fixture();
  assert.equal(await f.refund(), 'RF-S1');
  assert.equal(f.commits(), 1);
  assert.equal(f.docs.get('products/p').data.stock, 10);
  assert.equal(f.docs.get('sales/s').data.status, 'REFUNDED');
  assert.equal(f.docs.get('cash_ledger/refund-s').data.amount, 21.2);
  assert.equal(f.docs.get('cash_ledger/refund-s').data.type, 'out');
  assert.equal([...f.docs.values()].filter(row => row.data.type === 'RETURN').length, 1);
  await assert.rejects(f.refund(), /already been refunded/);
  assert.equal(f.commits(), 1);
});
test('concurrent returns cannot restore stock or issue a ledger reversal twice', async () => {
  const f = fixture();
  const results = await Promise.allSettled([f.refund(), f.refund()]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(f.commits(), 1);
  assert.equal(f.docs.get('products/p').data.stock, 10);
});
test('bank return uses the original account even when other accounts exist', async () => {
  const f = fixture({ paymentMethod: 'QR', bankAccountId: 'b' });
  await f.refund();
  assert.equal(f.docs.get('bank_ledger/refund-s').data.bankAccountId, 'b');
  assert.equal(f.docs.get('bank_ledger/refund-s').data.type, 'withdrawal');
  assert.equal(f.docs.has('cash_ledger/refund-s'), false);
});
for (const [name, overrides, error] of [
  ['historical bank sale without provenance', { paymentMethod: 'Bank Transfer' }, /original payment account/],
  ['other company sale', { companyId: 'other' }, /company/],
  ['invalid original quantity', { items: [{ productId: 'p', quantity: -1 }] }, /quantity/],
  ['invalid original amount', { total: NaN }, /Invalid original/],
]) test(`${name} rejects without any mutation`, async () => {
  const f = fixture(overrides); await assert.rejects(f.refund(), error);
  assert.equal(f.commits(), 0); assert.equal(f.docs.get('products/p').data.stock, 8);
});
test('cross-company products and bank accounts reject the complete return', async () => {
  for (const key of ['products/p', 'bank_accounts/b']) {
    const f = fixture({ paymentMethod: 'QR', bankAccountId: 'b' });
    f.docs.get(key).data.companyId = 'other';
    await assert.rejects(f.refund(), /company|account/); assert.equal(f.commits(), 0);
  }
});
test('a refund requires a meaningful audit reason', async () => {
  const f = fixture(); await assert.rejects(f.refund('   '), /reason/); assert.equal(f.commits(), 0);
});
test('duplicate item lines restore their combined quantity only once', async () => {
  const f = fixture({ items: [{ productId: 'p', quantity: 1 }, { productId: 'p', quantity: 1 }] });
  await f.refund(); assert.equal(f.docs.get('products/p').data.stock, 10);
  assert.equal([...f.docs.values()].filter(row => row.data.type === 'RETURN').length, 1);
});
