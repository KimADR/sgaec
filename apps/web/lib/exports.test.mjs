import assert from 'node:assert/strict';
import test from 'node:test';
import { requestsCsv } from './exports.ts';

test('CSV quotes fields and neutralizes spreadsheet formulas', () => {
  const csv = requestsCsv([{
    id: '1',
    number: '=1+1',
    type: 'CIN',
    citizen: 'Nom; "Prénom"',
    status: 'REGISTERED',
    created_at: '2026-11-09',
    url: '/cin/1',
  }]);

  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"Nom; ""Prénom"""'));
  assert.ok(csv.endsWith('\r\n'));
});
