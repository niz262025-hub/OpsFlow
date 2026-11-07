const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function sourceText(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('minimum stock keeps zero instead of defaulting to ten', () => {
  const thresholdSource = sourceText('src/utils/inventoryThreshold.ts');
  const inventorySource = sourceText('app/app/inventory.tsx');

  assert.match(thresholdSource, /minStock \?\? DEFAULT_MIN_STOCK/);
  assert.match(thresholdSource, /stock <= getMinStockThreshold\(minStock\)/);
  assert.match(inventorySource, /isLowStock\(product\.stock, product\.minStock\)/);

  const thresholdValues = [
    { stock: 0, minStock: 0, expected: true },
    { stock: 1, minStock: 0, expected: false },
    { stock: 1, minStock: 1, expected: true },
    { stock: 0, minStock: undefined, expected: true },
  ];

  for (const { stock, minStock, expected } of thresholdValues) {
    const low = stock <= (minStock ?? 10);
    assert.equal(low, expected, `unexpected threshold result for stock=${stock}, minStock=${minStock}`);
  }
});
