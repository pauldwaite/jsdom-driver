'use strict';

// Mocha configuration (see https://mochajs.org/#configuring-mocha-nodejs)
module.exports = {
  // Run .spec.js test files anywhere in the project...
     spec: ['./**/*.spec.js'],

  // ...except in node_modules, obviously
  exclude: ['./node_modules/**']
};
