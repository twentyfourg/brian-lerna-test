'use strict';

const action1 = require('..');
const assert = require('assert').strict;

assert.strictEqual(action1(), 'Hello from action1');
console.info('action1 tests passed');
