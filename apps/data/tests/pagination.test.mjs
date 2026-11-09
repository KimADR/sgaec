import assert from 'node:assert/strict';
import test from 'node:test';
import { pageResult, parsePagination } from '../src/pagination.mjs';

test('pagination defaults to the first page with a bounded page size', () => {
  assert.deepEqual(parsePagination({}), {
    page: 1,
    pageSize: 25,
    skip: 0,
    take: 25,
  });
});

test('pagination calculates stable offsets and response metadata', () => {
  const pagination = parsePagination({ page: '3', page_size: '20' });

  assert.deepEqual(pagination, { page: 3, pageSize: 20, skip: 40, take: 20 });
  assert.deepEqual(pageResult([], 101, pagination), {
    items: [],
    total: 101,
    page: 3,
    page_size: 20,
    total_pages: 6,
  });
});

test('pagination rejects malformed and out-of-range values', () => {
  for (const query of [
    { page: '1.5' },
    { page: '0' },
    { page_size: '101' },
    { page: ['1'] },
  ]) {
    assert.throws(() => parsePagination(query), (error) => error.status === 422);
  }
});
