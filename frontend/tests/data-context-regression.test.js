const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src', 'contexts', 'DataContext.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');

assert.match(
  source,
  /setDoc/,
  'DataContext should reference setDoc for company creation updates.'
);

console.log('DataContext regression test passed.');
