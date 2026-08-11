const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTrialCompanyData } = require('../src/utils/trialFlow');

test('buildTrialCompanyData creates a 7-day trial company payload', () => {
  const company = buildTrialCompanyData('Northwind Boutique', 'Ada Lovelace', 'ada@northwind.com');

  assert.equal(company.name, 'Northwind Boutique');
  assert.equal(company.status, 'trial');
  assert.equal(company.plan, 'basic');
  assert.equal(company.trialDays, 7);
  assert.equal(company.ownerEmail, 'ada@northwind.com');
  assert.equal(company.ownerName, 'Ada Lovelace');
  assert.ok(company.trialStartsAt instanceof Date);
  assert.ok(company.trialEndsAt instanceof Date);
  assert.ok(company.trialEndsAt.getTime() > company.trialStartsAt.getTime());
});
