import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const scrypt = promisify(scryptCallback);
const databaseUrl = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: process.env.DATABASE_URL },
    { schema: databaseUrl.searchParams.get('schema') || 'public' },
  ),
});

const tenants = [
  {
    code: 'LEGACY_ANTANANARIVO_DEMO',
    communeId: '00000000-0000-4000-8000-000000000001',
    centreId: '00000000-0000-4000-8000-000000000201',
    registerId: '00000000-0000-4000-8000-000000000301',
  },
  {
    code: 'COMMUNE_DEMO_A',
    communeId: '00000000-0000-4000-8000-000000000002',
    centreId: '00000000-0000-4000-8000-000000000202',
    registerId: '00000000-0000-4000-8000-000000000302',
  },
  {
    code: 'COMMUNE_DEMO_B',
    communeId: '00000000-0000-4000-8000-000000000003',
    centreId: '00000000-0000-4000-8000-000000000203',
    registerId: '00000000-0000-4000-8000-000000000303',
  },
];

const permissions = [
  'dashboard:read', 'citizens:read', 'citizens:manage', 'births:read', 'births:create',
  'births:workflow', 'cin:read', 'cin:create', 'cin:workflow', 'documents:preview',
  'documents:deliver', 'users:manage',
];
const roleDefinitions = [
  { code: 'COMMUNE_ADMIN', name: 'Administrateur communal', permissions },
  { code: 'AGENT_SAISIE', name: 'Agent de saisie', permissions: [
    'dashboard:read', 'citizens:read', 'citizens:manage', 'births:read', 'births:create', 'cin:read', 'cin:create',
  ] },
  { code: 'VALIDATEUR', name: 'Validateur', permissions: [
    'dashboard:read', 'citizens:read', 'births:read', 'births:workflow', 'cin:read', 'cin:workflow', 'documents:preview', 'documents:deliver',
  ] },
  { code: 'LECTURE_SEULE', name: 'Lecture seule', permissions: [
    'dashboard:read', 'citizens:read', 'births:read', 'cin:read', 'documents:preview',
  ] },
];

const legacyBirths = [
  { recordNumber: 'NAI-DEMO-2026-0001', lastName: 'RAKOTOMALALA', firstNames: 'Aina', sex: 'FEMALE',
    birthDate: new Date('2004-07-09T00:00:00Z'), nationality: 'Malagasy', district: 'Antananarivo II',
    municipality: 'Antananarivo', placeOfBirth: 'Antananarivo II',
    fatherName: 'RAKOTOMALALA Tiana', motherName: 'RABENARIVO Soa',
    address: 'Adresse fictive - Antananarivo', declarantName: 'Déclarant fictif', status: 'REGISTERED' },
  { recordNumber: 'NAI-DEMO-2026-0002', lastName: 'RANDRIAMAMONJY', firstNames: 'Mialy', sex: 'FEMALE',
    birthDate: new Date('2012-01-18T00:00:00Z'), nationality: 'Malagasy', district: 'Antananarivo II',
    municipality: 'Antananarivo', placeOfBirth: 'Antananarivo II',
    fatherName: 'RANDRIAMAMONJY Paul', motherName: 'ANDRIANTSOA Hery', status: 'VALIDATED' },
  { recordNumber: 'NAI-DEMO-2026-0003', lastName: 'RAJAONARISON', firstNames: 'Lova', sex: 'MALE',
    birthDate: new Date('2018-03-23T00:00:00Z'), nationality: 'Malagasy', district: 'Antananarivo II',
    municipality: 'Antananarivo', placeOfBirth: 'Antananarivo II', status: 'IN_REVIEW' },
  { recordNumber: 'NAI-DEMO-2026-0101', lastName: 'RAKOTOARISOA', firstNames: 'Ando', sex: 'MALE',
    birthDate: new Date('1998-05-12T00:00:00Z'), nationality: 'Malagasy', district: 'Antananarivo II',
    municipality: 'Antananarivo', placeOfBirth: 'Antananarivo II',
    address: 'Adresse fictive - Analamahitsy', declarantName: 'Donnée de démonstration', status: 'REGISTERED' },
  { recordNumber: 'NAI-DEMO-2026-0102', lastName: 'RAZAFINDRAKOTO', firstNames: 'Miora', sex: 'FEMALE',
    birthDate: new Date('2001-09-27T00:00:00Z'), nationality: 'Malagasy', district: 'Antananarivo II',
    municipality: 'Antananarivo', placeOfBirth: 'Antananarivo II',
    address: 'Adresse fictive - Anjanahary', declarantName: 'Donnée de démonstration', status: 'REGISTERED' },
  { recordNumber: 'NAI-DEMO-2026-0103', lastName: 'RANDRIANARIVELO', firstNames: 'Haja', sex: 'MALE',
    birthDate: new Date('1987-02-08T00:00:00Z'), nationality: 'Malagasy', district: 'Antananarivo II',
    municipality: 'Antananarivo', placeOfBirth: 'Antananarivo II',
    address: 'Adresse fictive - Ambohijatovo', declarantName: 'Donnée de démonstration', status: 'REGISTERED' },
  { recordNumber: 'NAI-DEMO-2026-0104', lastName: 'RABENASOLO', firstNames: 'Toky', sex: 'FEMALE',
    birthDate: new Date('2014-11-03T00:00:00Z'), nationality: 'Malagasy', district: 'Antananarivo II',
    municipality: 'Antananarivo', placeOfBirth: 'Antananarivo II',
    address: 'Adresse fictive - Isotry', declarantName: 'Donnée de démonstration', status: 'REGISTERED' },
  { recordNumber: 'NAI-DEMO-2026-0105', lastName: 'ANDRIAMBOLOLONA', firstNames: 'Fara', sex: 'FEMALE',
    birthDate: new Date('2009-07-19T00:00:00Z'), nationality: 'Malagasy', district: 'Antananarivo II',
    municipality: 'Antananarivo', placeOfBirth: 'Antananarivo II',
    address: 'Adresse fictive - Ankadifotsy', declarantName: 'Donnée de démonstration', status: 'REGISTERED' },
];

const legacyCin = [
  { fileNumber: 'CIN-DEMO-2026-0001', lastName: 'RAKOTONDRABE', firstNames: 'Soa Démonstration',
    birthDate: new Date('1996-03-12T00:00:00Z'), birthPlace: 'Antananarivo',
    address: 'Adresse fictive - Antananarivo II', district: 'Antananarivo II',
    profession: 'Employé (fictif)', hasBirthCertificate: true, hasResidenceProof: true,
    photosCount: 2, status: 'REGISTERED' },
  { fileNumber: 'CIN-DEMO-2026-0002', lastName: 'RASOANIRINA', firstNames: 'Lala Démonstration',
    birthDate: new Date('2001-08-05T00:00:00Z'), birthPlace: 'Antsirabe',
    address: 'Adresse fictive - Analamahitsy', district: 'Antananarivo II',
    profession: 'Artisan (fictif)', hasBirthCertificate: false, hasResidenceProof: true,
    photosCount: 1, status: 'IN_REVIEW' },
  { fileNumber: 'CIN-DEMO-2026-0003', lastName: 'RANDRIAFALY', firstNames: 'Hery Démonstration',
    birthDate: new Date('1992-11-22T00:00:00Z'), birthPlace: 'Fianarantsoa',
    address: 'Adresse fictive - Ankorondrano', district: 'Antananarivo II',
    profession: 'Technicien (fictif)', hasBirthCertificate: true, hasResidenceProof: true,
    photosCount: 2, status: 'VALIDATED' },
  { fileNumber: 'CIN-DEMO-2026-0004', lastName: 'RAZAFINDRABE', firstNames: 'Mira Démonstration',
    birthDate: new Date('1989-04-10T00:00:00Z'), birthPlace: 'Toamasina',
    address: 'Adresse fictive - Antanimena', district: 'Antananarivo II',
    profession: 'Commerçant (fictif)', hasBirthCertificate: true, hasResidenceProof: true,
    photosCount: 2, status: 'ISSUED' },
  { fileNumber: 'CIN-DEMO-2026-0005', lastName: 'RABENATOANDRO', firstNames: 'Feno Démonstration',
    birthDate: new Date('1999-07-27T00:00:00Z'), birthPlace: 'Antananarivo',
    address: 'Adresse fictive - Ambodivona', district: 'Antananarivo II',
    profession: 'Étudiant (fictif)', hasBirthCertificate: false, hasResidenceProof: false,
    photosCount: 0, status: 'REJECTED' },
  { fileNumber: 'CIN-DEMO-2026-0006', lastName: 'RATSIMBAZAFY', firstNames: 'Tovo Démonstration',
    birthDate: new Date('2000-01-18T00:00:00Z'), birthPlace: 'Mahajanga',
    address: 'Adresse fictive - Ambohijatovo', district: 'Antananarivo II',
    profession: 'Agent (fictif)', hasBirthCertificate: true, hasResidenceProof: false,
    photosCount: 1, status: 'REGISTERED' },
];

const tenantCin = {
  COMMUNE_DEMO_A: [
    { fileNumber: 'CIN-TEST-COMMUNE-A-0001', lastName: 'CIN-FICTIF-A', firstNames: 'Personne A',
      birthDate: new Date('1998-09-18T00:00:00Z'), birthPlace: 'Centre fictif A',
      address: 'Adresse fictive A', district: 'Arrondissement A fictif',
      hasBirthCertificate: true, hasResidenceProof: true, photosCount: 2, status: 'REGISTERED' },
    { fileNumber: 'CIN-TEST-COMMUNE-A-0002', lastName: 'CIN-FICTIF-A-2', firstNames: 'Personne A2',
      birthDate: new Date('1997-02-10T00:00:00Z'), birthPlace: 'Centre fictif A',
      address: 'Adresse fictive A', district: 'Arrondissement A fictif',
      hasBirthCertificate: true, hasResidenceProof: false, photosCount: 1, status: 'IN_REVIEW' },
    { fileNumber: 'CIN-TEST-COMMUNE-A-0003', lastName: 'CIN-FICTIF-A-3', firstNames: 'Personne A3',
      birthDate: new Date('1991-06-14T00:00:00Z'), birthPlace: 'Centre fictif A',
      address: 'Adresse fictive A', district: 'Arrondissement A fictif',
      hasBirthCertificate: true, hasResidenceProof: true, photosCount: 2, status: 'ISSUED' },
  ],
  COMMUNE_DEMO_B: [
    { fileNumber: 'CIN-TEST-COMMUNE-B-0001', lastName: 'CIN-FICTIF-B', firstNames: 'Personne B',
      birthDate: new Date('1993-12-03T00:00:00Z'), birthPlace: 'Centre fictif B',
      address: 'Adresse fictive B', district: 'Arrondissement B fictif',
      hasBirthCertificate: true, hasResidenceProof: true, photosCount: 2, status: 'REGISTERED' },
    { fileNumber: 'CIN-TEST-COMMUNE-B-0002', lastName: 'CIN-FICTIF-B-2', firstNames: 'Personne B2',
      birthDate: new Date('1990-04-24T00:00:00Z'), birthPlace: 'Centre fictif B',
      address: 'Adresse fictive B', district: 'Arrondissement B fictif',
      hasBirthCertificate: true, hasResidenceProof: true, photosCount: 2, status: 'VALIDATED' },
    { fileNumber: 'CIN-TEST-COMMUNE-B-0003', lastName: 'CIN-FICTIF-B-3', firstNames: 'Personne B3',
      birthDate: new Date('1995-08-31T00:00:00Z'), birthPlace: 'Centre fictif B',
      address: 'Adresse fictive B', district: 'Arrondissement B fictif',
      hasBirthCertificate: false, hasResidenceProof: false, photosCount: 0, status: 'REJECTED' },
  ],
};

const tenantExamples = [
  {
    tenantCode: 'COMMUNE_DEMO_A',
    birth: {
      recordNumber: 'NAI-TEST-COMMUNE-A-0001',
      lastName: 'CITOYEN-FICTIF-A',
      firstNames: 'Personne Démonstration A',
      sex: 'FEMALE',
      birthDate: new Date('2000-01-01T00:00:00Z'),
      nationality: 'Malagasy',
      district: 'Arrondissement A fictif',
      municipality: 'Commune fictive A',
      placeOfBirth: 'Centre fictif A',
      declarantName: 'Déclarant fictif A',
      status: 'REGISTERED',
    },
  },
  {
    tenantCode: 'COMMUNE_DEMO_B',
    birth: {
      recordNumber: 'NAI-TEST-COMMUNE-B-0001',
      lastName: 'CITOYEN-FICTIF-B',
      firstNames: 'Personne Démonstration B',
      sex: 'MALE',
      birthDate: new Date('2001-02-02T00:00:00Z'),
      nationality: 'Malagasy',
      district: 'Arrondissement B fictif',
      municipality: 'Commune fictive B',
      placeOfBirth: 'Centre fictif B',
      declarantName: 'Déclarant fictif B',
      status: 'REGISTERED',
    },
  },
];

async function passwordHash(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function seedBirthForTenant(tx, tenant, input) {
  const existing = await tx.birthRecord.findUnique({ where: { recordNumber: input.recordNumber } });
  if (existing) return;

  const citizen = await tx.citizen.create({ data: {
    communeId: tenant.communeId,
    centreEtatCivilId: tenant.centreId,
    lastName: input.lastName,
    firstNames: input.firstNames,
    sex: input.sex,
    birthDate: input.birthDate,
    nationality: input.nationality,
    birthPlace: input.placeOfBirth,
  } });
  const declaration = await tx.birthDeclaration.create({ data: {
    communeId: tenant.communeId,
    centreEtatCivilId: tenant.centreId,
    registreId: tenant.registerId,
    citoyenId: citizen.id,
    status: ({
      REGISTERED: 'SUBMITTED',
      IN_REVIEW: 'IN_REVIEW',
      VALIDATED: 'VALIDATED',
      ISSUED: 'VALIDATED',
      REJECTED: 'REJECTED',
    })[input.status] || 'SUBMITTED',
    declarantName: input.declarantName || null,
    submittedAt: new Date(),
    ...(input.status === 'VALIDATED' || input.status === 'ISSUED' ? { validatedAt: new Date() } : {}),
    ...(input.status === 'REJECTED'
      ? { rejectedAt: new Date(), rejectionReason: 'Cas fictif de démonstration' }
      : {}),
  } });
  await tx.birthRecord.create({ data: {
    ...input,
    communeId: tenant.communeId,
    centreEtatCivilId: tenant.centreId,
    registreId: tenant.registerId,
    citoyenId: citizen.id,
    declarationId: declaration.id,
    officeCode: tenant.code,
  } });
}

async function seedCinForTenant(tx, tenant, inputs) {
  for (const input of inputs) {
    const existing = await tx.cinApplication.findUnique({ where: { fileNumber: input.fileNumber } });
    if (existing) {
      if (existing.communeId !== tenant.communeId) {
        throw new Error(`Numéro CIN de démonstration déjà utilisé dans une autre commune: ${input.fileNumber}`);
      }
      continue;
    }
    await tx.cinApplication.create({ data: {
      ...input,
      communeId: tenant.communeId,
      centreEtatCivilId: tenant.centreId,
      officeCode: tenant.code,
    } });
  }
}

async function main() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!username || !/^[A-Za-z0-9._-]{3,80}$/.test(username)
    || !password || password.length < 16 || password.length > 256) {
    throw new Error('Set BOOTSTRAP_ADMIN_USERNAME and a 16-256 character BOOTSTRAP_ADMIN_PASSWORD before seeding.');
  }

  const allPermissions = await Promise.all(permissions.map((code) =>
    prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    })));
  const permissionsByCode = new Map(allPermissions.map((permission) => [permission.code, permission]));
  const seededRoles = new Map();
  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { code: definition.code },
      update: { name: definition.name },
      create: { code: definition.code, name: definition.name },
    });
    seededRoles.set(definition.code, role);
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.createMany({
        data: definition.permissions.map((code) => ({
          roleId: role.id,
          permissionId: permissionsByCode.get(code).id,
        })),
        skipDuplicates: true,
      });
    });
  }
  const role = seededRoles.get('COMMUNE_ADMIN');

  const hashedPassword = await passwordHash(password);
  const user = await prisma.utilisateur.upsert({
    where: { username },
    update: { fullName: 'Administrateur de démonstration', passwordHash: hashedPassword, active: true },
    create: {
      username,
      fullName: 'Administrateur de démonstration',
      passwordHash: hashedPassword,
    },
  });

  for (const tenant of tenants) {
    const assignment = await prisma.affectation.findFirst({
      where: {
        utilisateurId: user.id,
        roleId: role.id,
        communeId: tenant.communeId,
        centreEtatCivilId: tenant.centreId,
      },
    });
    if (!assignment) {
      await prisma.affectation.create({ data: {
        utilisateurId: user.id,
        roleId: role.id,
        communeId: tenant.communeId,
        centreEtatCivilId: tenant.centreId,
      } });
    } else if (!assignment.active) {
      await prisma.affectation.update({ where: { id: assignment.id }, data: { active: true } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.commune_id', ${tenant.communeId}, true)`;
      const commune = await tx.commune.findUnique({ where: { id: tenant.communeId } });
      if (!commune || commune.code !== tenant.code) {
        throw new Error(`Required migrated commune is missing or mismatched: ${tenant.code}`);
      }
      const centre = await tx.centreEtatCivil.findFirst({
        where: { id: tenant.centreId, communeId: tenant.communeId },
      });
      if (!centre) throw new Error(`Required centre is missing: ${tenant.code}`);
      const currentYear = new Date().getUTCFullYear();
      const currentRegister = await tx.registre.findFirst({
        where: {
          communeId: tenant.communeId,
          centreEtatCivilId: centre.id,
          type: 'BIRTH',
          year: currentYear,
          closedAt: null,
        },
      });
      if (!currentRegister) {
        await tx.registre.create({ data: {
          communeId: tenant.communeId,
          centreEtatCivilId: centre.id,
          code: `REG-${tenant.code}-${currentYear}`,
          type: 'BIRTH',
          year: currentYear,
        } });
      }
      if (tenant.code === 'LEGACY_ANTANANARIVO_DEMO') {
        for (const input of legacyBirths) await seedBirthForTenant(tx, tenant, input);
      }
      const example = tenantExamples.find((item) => item.tenantCode === tenant.code);
      if (example) await seedBirthForTenant(tx, tenant, example.birth);
      const cinExamples = tenant.code === 'LEGACY_ANTANANARIVO_DEMO'
        ? legacyCin : (tenantCin[tenant.code] || []);
      await seedCinForTenant(tx, tenant, cinExamples);
    });
  }
  console.log('Seed terminé : comptes, naissances et CIN fictives dans trois communes isolées.');
}

main()
  .catch((error) => {
    console.error('Échec du seed SGAEC:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
