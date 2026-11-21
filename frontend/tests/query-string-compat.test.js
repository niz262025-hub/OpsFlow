const { test } = require('node:test');
const assert = require('node:assert/strict');
const queryString = require('../src/utils/query-string-compat');

test('router query compatibility preserves Unicode, empty values and fragments', () => {
  const query = { name: '商品 தமிழ்', empty: '', flag: null, code: '00123' };
  assert.deepEqual({ ...queryString.parse(queryString.stringify(query)) }, query);
  const result = queryString.parseUrl('/app/pos?code=00123#receipt', { parseFragmentIdentifier: true });
  assert.equal(result.url, '/app/pos');
  assert.equal(result.query.code, '00123');
  assert.equal(result.fragmentIdentifier, 'receipt');
});

test('router query compatibility tolerates malformed percent encoding', () => {
  const value = queryString.parse('next=%E0%A4%A&code=00123');
  assert.equal(typeof value.next, 'string');
  assert.equal(value.code, '00123');
});
