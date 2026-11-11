// Metro resolves this module for legacy router consumers. This module's own
// import resolves to the actual package, whose maintained API is a default export.
const queryString = require('query-string');
module.exports = queryString.default || queryString;
