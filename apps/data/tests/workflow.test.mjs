import assert from 'node:assert/strict';
import test from 'node:test';
import { canEditCinEvidence, checkCinTransition, CIN_TRANSITIONS, requestScopeFilter } from '../src/workflow.mjs';

const complete = { status: 'IN_REVIEW', hasBirthCertificate: true, hasResidenceProof: true, photosCount: 2 };

test('CIN progression is gated by workflow and delivery permissions', () => {
  assert.equal(checkCinTransition({ status: 'REGISTERED' }, 'IN_REVIEW').permission, 'cin:workflow');
  assert.equal(checkCinTransition(complete, 'VALIDATED'), CIN_TRANSITIONS.VALIDATED);
  assert.equal(checkCinTransition({ status: 'VALIDATED' }, 'ISSUED').permission, 'documents:deliver');
});

test('CIN validation rejects missing declared evidence', () => {
  for (const changes of [{ hasBirthCertificate: false }, { hasResidenceProof: false }, { photosCount: 1 }]) {
    assert.throws(() => checkCinTransition({ ...complete, ...changes }, 'VALIDATED'),
      error => error.status === 409 && error.message.includes('incomplet'));
  }
});

test('CIN rejection requires a reason and terminal statuses cannot transition', () => {
  assert.throws(() => checkCinTransition(complete, 'REJECTED', 'a'), error => error.status === 422);
  assert.equal(checkCinTransition(complete, 'REJECTED', 'Pièces incomplètes').permission, 'cin:workflow');
  assert.throws(() => checkCinTransition({ status: 'ISSUED' }, 'IN_REVIEW'), error => error.status === 409);
  assert.throws(() => checkCinTransition(complete, 'UNKNOWN'), error => error.status === 422);
});

test('active and closed scopes stay disjoint and reject incompatible status filters', () => {
  assert.deepEqual(requestScopeFilter('all', ''), {});
  assert.deepEqual(requestScopeFilter('active', ''), { status: { in: ['REGISTERED', 'IN_REVIEW', 'VALIDATED'] } });
  assert.deepEqual(requestScopeFilter('closed', ''), { status: { in: ['ISSUED', 'REJECTED'] } });
  assert.deepEqual(requestScopeFilter('closed', 'ISSUED'), { status: 'ISSUED' });
  assert.throws(() => requestScopeFilter('active', 'ISSUED'), error => error.status === 422);
  assert.throws(() => requestScopeFilter('invalid', ''), error => error.status === 422);
});

test('CIN evidence is editable only before validation', () => {
  assert.equal(canEditCinEvidence('REGISTERED'), true);
  assert.equal(canEditCinEvidence('IN_REVIEW'), true);
  for (const status of ['VALIDATED', 'ISSUED', 'REJECTED']) {
    assert.equal(canEditCinEvidence(status), false);
  }
});
