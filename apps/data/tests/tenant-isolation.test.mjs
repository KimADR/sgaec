import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const tenants = [
  {
    code: 'COMMUNE_DEMO_A',
    id: '00000000-0000-4000-8000-000000000002',
    ownWitness: 'CITOYEN-FICTIF-A',
    otherWitness: 'CITOYEN-FICTIF-B',
  },
  {
    code: 'COMMUNE_DEMO_B',
    id: '00000000-0000-4000-8000-000000000003',
    ownWitness: 'CITOYEN-FICTIF-B',
    otherWitness: 'CITOYEN-FICTIF-A',
  },
];

test('PostgreSQL RLS isolates demonstration communes', async (t) => {
  if (process.env.SGAEC_RUN_TENANT_TESTS !== '1' || !process.env.DATABASE_URL) {
    t.skip('Set SGAEC_RUN_TENANT_TESTS=1 and DATABASE_URL to run against migrated PostgreSQL.');
    return;
  }

  const url = new URL(process.env.DATABASE_URL);
  const prisma = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: process.env.DATABASE_URL },
      { schema: url.searchParams.get('schema') || 'public' },
    ),
  });

  try {
    const [role] = await prisma.$queryRaw`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
    `;
    assert.ok(role, 'The database role must be visible to PostgreSQL.');
    assert.equal(role.rolsuper, false, 'RLS test must not use a PostgreSQL superuser.');
    assert.equal(role.rolbypassrls, false, 'RLS test role must not bypass row-level security.');

    for (const tenant of tenants) {
      const visibleRecords = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.commune_id', ${tenant.id}, true)`;
        const [births, citizens] = await Promise.all([
          tx.birthRecord.findMany({ select: { lastName: true } }),
          tx.citizen.findMany({ select: { lastName: true } }),
        ]);
        return { births, citizens };
      });
      const birthNames = visibleRecords.births.map((record) => record.lastName);
      assert.ok(
        birthNames.includes(tenant.ownWitness),
        `${tenant.code} must see its seeded witness record.`,
      );
      assert.ok(
        !birthNames.includes(tenant.otherWitness),
        `${tenant.code} must not see the other commune's witness record.`,
      );
      const citizenNames = visibleRecords.citizens.map((citizen) => citizen.lastName);
      assert.ok(
        citizenNames.includes(tenant.ownWitness),
        `${tenant.code} must see its backfilled citizen.`,
      );
      assert.ok(
        !citizenNames.includes(tenant.otherWitness),
        `${tenant.code} must not see the other commune's citizen.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
});
