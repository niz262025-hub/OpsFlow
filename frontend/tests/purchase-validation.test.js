const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/utils/purchaseValidation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports });
const { purchaseLines, receiptLines } = mod.exports;
const line = { productId: 'p1', productName: 'Test', sku: 'SKU1', quantity: 10, unitCost: 5, receivedQuantity: 7 };
test('order values are recalculated from valid quantity and unit cost', () => {
  assert.equal(purchaseLines([{ ...line, total: 999 }])[0].total, 50);
  for (const quantity of [0, -1, NaN, Infinity]) assert.throws(() => purchaseLines([{ ...line, quantity }]));
  assert.throws(() => purchaseLines([{ ...line, unitCost: -1 }]));
  assert.throws(() => purchaseLines([line, line]));
});
test('partial receipt cannot exceed outstanding quantity', () => {
  const order = { status: 'Partially Received', items: [line] };
  const valid = receiptLines(order, [{ productId: 'p1', receivedQuantity: 3, unitCost: 999 }]);
  assert.equal(valid[0].unitCost, 5);
  assert.equal(valid[0].total, 15);
  assert.throws(() => receiptLines(order, [{ productId: 'p1', receivedQuantity: 4 }]));
});
test('receipts deny invalid, duplicate and unrelated order lines', () => {
  const order = { status: 'Sent', items: [line] };
  for (const receivedQuantity of [0, -1, NaN, Infinity]) assert.throws(() => receiptLines(order, [{ productId: 'p1', receivedQuantity }]));
  assert.throws(() => receiptLines(order, [{ productId: 'other', receivedQuantity: 1 }]));
  assert.throws(() => receiptLines(order, [{ productId: 'p1', receivedQuantity: 1 }, { productId: 'p1', receivedQuantity: 1 }]));
});
test('closed and fully received orders cannot be received twice', () => {
  for (const status of ['Closed', 'Fully Received']) assert.throws(() => receiptLines({ status, items: [line] }, [{ productId: 'p1', receivedQuantity: 1 }]));
  assert.throws(() => receiptLines({ status: 'Partially Received', items: [{ ...line, receivedQuantity: 10 }] }, [{ productId: 'p1', receivedQuantity: 1 }]));
});
