import test from 'node:test';
import assert from 'node:assert/strict';
import { reportPeriod, summarizeWorkflowCounts } from '../src/reporting.mjs';

test('report periods use Antananarivo civil-day boundaries and include the end date', () => {
  const period = reportPeriod('2026-11-07', '2026-11-07');
  assert.equal(period.startAt.toISOString(), '2026-11-06T21:00:00.000Z');
  assert.equal(period.endExclusive.toISOString(), '2026-11-07T21:00:00.000Z');
});

test('report periods reject malformed, reversed, and oversized date ranges', () => {
  assert.throws(() => reportPeriod('2026-02-30', '2026-03-01'), /Dates de période invalides/);
  assert.throws(() => reportPeriod('1899-12-31', '1900-01-01'), /Dates de période invalides/);
  assert.throws(() => reportPeriod('2026-11-08', '2026-11-07'), /ne pas dépasser/);
  assert.throws(() => reportPeriod('2025-01-01', '2026-01-02'), /ne pas dépasser/);
});

test('report counts merge statuses and include missing categories as zero', () => {
  const report = summarizeWorkflowCounts(
    [{ status: 'REGISTERED', _count: { _all: 2 } }, { status: 'ISSUED', _count: { _all: 1 } }],
    [{ status: 'IN_REVIEW', _count: { _all: 3 } }],
    { startDate: '2026-11-01', endDate: '2026-11-30' },
    new Date('2026-11-07T12:00:00.000Z'),
  );
  assert.equal(report.total, 6);
  assert.deepEqual(report.by_type, [
    { type: 'Naissance', total: 3 },
    { type: 'CIN', total: 3 },
  ]);
  assert.deepEqual(report.by_status.find(row => row.status === 'VALIDATED'), {
    status: 'VALIDATED', births: 0, cin: 0, total: 0,
  });
  assert.equal(report.generated_at, '2026-11-07T12:00:00.000Z');
});
