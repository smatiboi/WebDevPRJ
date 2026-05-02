const test = require('node:test');
const assert = require('node:assert/strict');
const { getPagination, pageMeta } = require('../backend/utils/pagination');

test('getPagination normalizes page and limit', () => {
  assert.deepEqual(getPagination({ page: '3', limit: '20' }), {
    page: 3,
    limit: 20,
    offset: 40
  });
});

test('getPagination caps large limits', () => {
  assert.deepEqual(getPagination({ page: '-4', limit: '500' }), {
    page: 1,
    limit: 50,
    offset: 0
  });
});

test('pageMeta computes total pages', () => {
  assert.deepEqual(pageMeta(2, 10, 31), {
    page: 2,
    limit: 10,
    total: 31,
    totalPages: 4
  });
});
