import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(dirname, '../prisma/seed.mjs'), 'utf8');
const start = source.indexOf('const legacyCin = [');
const end = source.indexOf('const tenantExamples = [');
assert.ok(start >= 0 && end > start, 'Section des dossiers CIN du seed absente');
const { legacyCin, tenantCin } = vm.runInNewContext(
  `${source.slice(start, end)}\n({ legacyCin, tenantCin })`,
  { Date },
);

test('a pristine installation contains illustrative CIN cases in every commune', () => {
  assert.equal(legacyCin.length, 6);
  assert.equal(tenantCin.COMMUNE_DEMO_A.length, 3);
  assert.equal(tenantCin.COMMUNE_DEMO_B.length, 3);
  const statuses = new Set(legacyCin.map((entry) => entry.status));
  assert.deepEqual([...statuses].sort(),
    ['REGISTERED', 'IN_REVIEW', 'VALIDATED', 'ISSUED', 'REJECTED'].sort());
});

test('CIN fixtures are well formed, fictional and have globally unique case numbers', () => {
  const all = [...legacyCin, ...tenantCin.COMMUNE_DEMO_A, ...tenantCin.COMMUNE_DEMO_B];
  const numbers = new Set();
  for (const item of all) {
    for (const field of ['fileNumber', 'lastName', 'firstNames', 'birthPlace', 'address', 'district']) {
      assert.ok(typeof item[field] === 'string' && item[field].length > 0, `${item.fileNumber}: ${field}`);
    }
    assert.ok(item.birthDate instanceof Date && !Number.isNaN(item.birthDate.getTime()));
    assert.ok(typeof item.hasBirthCertificate === 'boolean');
    assert.ok(typeof item.hasResidenceProof === 'boolean');
    assert.ok(Number.isInteger(item.photosCount) && item.photosCount >= 0 && item.photosCount <= 8);
    assert.ok(!numbers.has(item.fileNumber), `Numéro en doublon: ${item.fileNumber}`);
    numbers.add(item.fileNumber);
  }
  assert.equal(all.length, 12);
  assert.ok(tenantCin.COMMUNE_DEMO_A.some((entry) => entry.lastName === 'CIN-FICTIF-A'));
  assert.ok(tenantCin.COMMUNE_DEMO_B.some((entry) => entry.lastName === 'CIN-FICTIF-B'));
});
