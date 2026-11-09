import assert from 'node:assert/strict';
import test from 'node:test';
import { paginationModel } from './pagination.ts';

test('pagination model reports range and every page for small result sets', () => {
  assert.deepEqual(paginationModel(12, 2, 5), {
    page: 2,
    totalPages: 3,
    firstResult: 6,
    lastResult: 10,
    items: [1, 2, 3],
  });
});

test('pagination model clamps page and inserts ellipses for long lists', () => {
  assert.deepEqual(paginationModel(500, 99, 10), {
    page: 50,
    totalPages: 50,
    firstResult: 491,
    lastResult: 500,
    items: [1, 2, 'ellipsis', 49, 50],
  });
});

test('pagination model returns a safe empty range', () => {
  assert.deepEqual(paginationModel(0, 4, 10), {
    page: 1,
    totalPages: 0,
    firstResult: 0,
    lastResult: 0,
    items: [],
  });
});
