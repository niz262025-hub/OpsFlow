const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/utils/dashboardTotals.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports, Date, Intl });
const { salesByDay, cashLedgerBalance } = mod.exports;
const now = new Date('2026-10-30T01:00:00Z');
test('empty accounts have zero sales and zero cash, never demo values', () => {
  assert.equal(salesByDay([], now).values.reduce((a, b) => a + b, 0), 0);
  assert.equal(cashLedgerBalance([]), 0);
});
test('seven day graph and today use Malaysia midnight, ignoring old or invalid dates', () => {
  const report = salesByDay([
    { total: 10.6, createdAt: '2026-10-29T16:00:00Z' },
    { total: 2, createdAt: '2026-10-29T15:59:59Z' },
    { total: 999, createdAt: '2026-10-01T00:00:00Z' },
    { total: 999, createdAt: 'invalid' },
    { total: 999 },
  ], now);
  assert.equal(report.today, 10.6);
  assert.equal(report.values[5], 2);
  assert.equal(report.values.reduce((a, b) => a + b, 0), 12.6);
  assert.equal(report.labels[6], '10-30');
});
test('cash includes inflows and subtracts outflows without double-counting sales', () => {
  assert.equal(cashLedgerBalance([{ type: 'opening', amount: 100 }, { type: 'in', amount: 10.6 }, { type: 'expense', amount: 5 }, { type: 'transfer_out', amount: 10 }, { type: 'capital', amount: 20 }, { type: 'unknown', amount: 999 }]), 115.6);
});
test('decimal amounts sum in cents and invalid amounts are ignored', () => {
  assert.equal(cashLedgerBalance([{ type: 'in', amount: 0.1 }, { type: 'in', amount: 0.2 }, { type: 'in', amount: NaN }]), 0.3);
});
