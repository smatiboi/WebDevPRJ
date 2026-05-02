const test = require('node:test');
const assert = require('node:assert/strict');
const { AppError } = require('../backend/utils/errors');

test('AppError carries status and details', () => {
  const error = new AppError('Nope', 409, { field: 'isbn' });
  assert.equal(error.message, 'Nope');
  assert.equal(error.status, 409);
  assert.deepEqual(error.details, { field: 'isbn' });
});
