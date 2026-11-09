import test from 'node:test';
import assert from 'node:assert/strict';
import { reportsCsv } from './reports.ts';

test('CSV export labels demo data and exports aggregates without personal records', () => {
  const csv = reportsCsv({
    start_date: '2026-11-01',
    end_date: '2026-11-30',
    generated_at: '2026-11-07T12:00:00.000Z',
    total: 3,
    by_type: [{ type: 'Naissance', total: 2 }, { type: 'CIN', total: 1 }],
    by_status: [{
      status: 'REGISTERED', births: 2, cin: 1, total: 3,
    }],
  });
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /Données fictives de démonstration/);
  assert.match(csv, /2026-11-01/);
  assert.doesNotMatch(csv, /Nom|citoyen|référence/i);
});

test('CSV cells quote separators and neutralize spreadsheet formulas', () => {
  const csv = reportsCsv({
    start_date: '=1+1',
    end_date: '2026-11-30',
    generated_at: '2026-11-07T12:00:00.000Z',
    total: 0,
    by_type: [],
    by_status: [],
  });
  assert.match(csv, /"'=1\+1"/);
  assert.match(csv, /"Données fictives de démonstration"/);
});
