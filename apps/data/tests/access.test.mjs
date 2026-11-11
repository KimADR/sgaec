import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTerritorialAccess } from '../src/access.mjs';

const assignment = (centreEtatCivilId, ...permissions) => ({
  centreEtatCivilId,
  role: {
    code: `ROLE-${permissions.join('-')}`,
    permissions: permissions.map((code) => ({ permission: { code } })),
  },
});

test('a role in one centre never inherits a different role from another centre', () => {
  const access = buildTerritorialAccess([
    assignment('A', 'citizens:manage', 'births:read'),
    assignment('B', 'births:workflow', 'documents:preview'),
  ], ['A', 'B']);
  assert.deepEqual(access.scopeFor('births:workflow'), {
    permitted: true, communeWide: false, centreIds: ['B'],
  });
  assert.deepEqual(access.scopeFor('citizens:manage'), {
    permitted: true, communeWide: false, centreIds: ['A'],
  });
  assert.deepEqual(access.scopeFor(['births:read', 'documents:preview']), {
    permitted: false, communeWide: false, centreIds: [],
  });
  assert.deepEqual(access.scopeFor(['births:read', 'births:workflow'], 'any'), {
    permitted: true, communeWide: false, centreIds: ['A', 'B'],
  });
});

test('a commune-wide grant intersects correctly with a centre-specific grant', () => {
  const access = buildTerritorialAccess([
    assignment(null, 'documents:preview', 'dashboard:read'),
    assignment('B', 'births:read'),
  ], ['A', 'B']);
  assert.deepEqual(access.scopeFor('documents:preview'), {
    permitted: true, communeWide: true, centreIds: [],
  });
  assert.deepEqual(access.scopeFor(['documents:preview', 'births:read']), {
    permitted: true, communeWide: false, centreIds: ['B'],
  });
});

test('inactive or unassigned centres grant no territorial permissions', () => {
  const access = buildTerritorialAccess([assignment('A', 'citizens:read')], ['B']);
  assert.equal(access.permissions.size, 0);
  assert.deepEqual(access.scopeFor('citizens:read'), {
    permitted: false, communeWide: false, centreIds: [],
  });
});
