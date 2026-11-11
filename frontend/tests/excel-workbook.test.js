const { test } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');

test('Excel exports preserve multilingual product names and numeric MYR amounts', () => {
  const rows = [
    ['Product', 'Quantity', 'Unit price', 'Total'],
    ['Kebaya / Baju', 2, 39.9, 79.8],
    ['商品', 1, 12.5, 12.5],
    ['பொருள்', 3, 4.25, 12.75],
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Sales');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const restored = XLSX.read(bytes, { type: 'buffer' });
  assert.deepEqual(XLSX.utils.sheet_to_json(restored.Sheets.Sales, { header: 1 }), rows);
  assert.equal(restored.Sheets.Sales.D2.t, 'n');
  assert.equal(restored.Sheets.Sales.D2.v, 79.8);
});
