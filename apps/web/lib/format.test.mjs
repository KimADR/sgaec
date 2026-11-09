import assert from 'node:assert/strict';
import test from 'node:test';
import { dateFr, todayInAntananarivo } from './format.ts';

test('dateFr keeps civil birth dates in their entered calendar day', () => {
  assert.match(dateFr('2026-11-07'), /07 nov\. 2026/);
});

test('dateFr renders timestamps in Antananarivo time', () => {
  assert.match(dateFr('2026-11-07T23:30:00Z'), /08 nov\. 2026/);
});

test('birth-date limits use the Antananarivo civil day', () => {
  assert.equal(todayInAntananarivo(new Date('2026-11-07T23:30:00Z')), '2026-11-08');
});

test('dateFr handles absent and invalid values explicitly', () => {
  assert.equal(dateFr(null), '—');
  assert.equal(dateFr('not-a-date'), '—');
});
