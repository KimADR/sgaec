import express from 'express';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { pageResult, parsePagination } from './pagination.mjs';
import { reportPeriod, summarizeWorkflowCounts } from './reporting.mjs';
import { CIN_TRANSITIONS, checkCinTransition, requestScopeFilter, canEditCinEvidence } from './workflow.mjs';
import { buildTerritorialAccess } from './access.mjs';

const scrypt = promisify(scryptCallback);

if (!process.env.INTERNAL_API_TOKEN || process.env.INTERNAL_API_TOKEN.length < 20) {
  throw new Error('INTERNAL_API_TOKEN must contain at least 20 characters.');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set.');
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const schema = databaseUrl.searchParams.get('schema') || 'public';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema }),
});
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'sgaec-data', database: 'ready' });
  } catch (_error) {
    res.status(503).json({ ok: false, detail: 'Base de données indisponible' });
  }
});

app.use('/internal', (req, res, next) => {
  if (req.header('x-internal-token') !== process.env.INTERNAL_API_TOKEN) {
    return res.status(401).json({ detail: 'Accès interne refusé' });
  }
  next();
});

const permissionDescription = {
  'dashboard:read': 'Consulter le tableau de bord',
  'citizens:read': 'Consulter les citoyens',
  'citizens:manage': 'Créer, modifier et archiver les citoyens',
  'births:read': 'Consulter les déclarations et actes de naissance',
  'births:create': 'Créer une déclaration de naissance',
  'births:workflow': 'Instruire et valider une déclaration de naissance',
  'cin:read': 'Consulter les dossiers CIN',
  'cin:create': 'Créer un dossier CIN',
  'cin:workflow': 'Instruire, valider ou rejeter un dossier CIN',
  'documents:preview': 'Prévisualiser un document spécimen',
  'documents:deliver': 'Enregistrer la délivrance d’un document',
  'users:manage': 'Gérer les utilisateurs de la commune',
};

const dateStr = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : value;
const birthInclude = {
  commune: { select: { id: true, code: true, name: true } },
  centre: { select: { id: true, code: true, name: true } },
  registre: { select: { id: true, code: true, year: true, type: true } },
};
const citizenInclude = {
  commune: { select: { id: true, code: true, name: true } },
  centre: { select: { id: true, code: true, name: true } },
  birthRecords: {
    select: { id: true, recordNumber: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  },
};
const birthJson = (r) => ({
  id: r.id, record_number: r.recordNumber, last_name: r.lastName,
  first_names: r.firstNames, sex: r.sex === 'MALE' ? 'M' : 'F',
  birth_date: dateStr(r.birthDate), nationality: r.nationality,
  district: r.district, municipality: r.municipality, place_of_birth: r.placeOfBirth,
  father_name: r.fatherName || '', mother_name: r.motherName || '',
  address: r.address || '', declarant_name: r.declarantName || '',
  status: r.status, created_at: r.createdAt.toISOString(),
  commune: r.commune, centre: r.centre, registre: r.registre,
});
const citizenJson = (r) => ({
  id: r.id, last_name: r.lastName, first_names: r.firstNames,
  sex: r.sex === 'MALE' ? 'M' : 'F', birth_date: dateStr(r.birthDate),
  nationality: r.nationality, birth_place: r.birthPlace, active: r.active,
  created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
  commune: r.commune, centre: r.centre,
  birth_records: r.birthRecords.map((record) => ({
    id: record.id, record_number: record.recordNumber, status: record.status,
    created_at: record.createdAt.toISOString(),
  })),
});
const cinJson = (r) => ({
  id: r.id, file_number: r.fileNumber, last_name: r.lastName,
  first_names: r.firstNames, birth_date: dateStr(r.birthDate),
  birth_place: r.birthPlace, address: r.address, district: r.district,
  profession: r.profession || '', father_name: r.fatherName || '',
  mother_name: r.motherName || '', has_birth_certificate: r.hasBirthCertificate,
  has_residence_proof: r.hasResidenceProof, photos_count: r.photosCount,
  status: r.status, created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
  commune: r.commune, centre: r.centre,
});

const safeQuery = (query) => typeof query === 'string' ? query.trim().slice(0, 80) : '';
const makeDemoNumber = (prefix) => `${prefix}-DEMO-${new Date().getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
const workflowStatuses = new Set(['REGISTERED', 'IN_REVIEW', 'VALIDATED', 'ISSUED', 'REJECTED']);
const dummySalt = Buffer.alloc(16, 0x53);
const dummyHash = Buffer.alloc(64, 0x41);
const assignableRoles = new Set(['COMMUNE_ADMIN', 'AGENT_SAISIE', 'VALIDATEUR', 'LECTURE_SEULE']);

async function passwordMatches(password, storedHash) {
  const [algorithm, saltText, hashText] = typeof storedHash === 'string' ? storedHash.split('$') : [];
  const validFormat = algorithm === 'scrypt' && saltText && /^[0-9a-f]{32}$/i.test(saltText)
    && hashText && /^[0-9a-f]{128}$/i.test(hashText);
  const salt = validFormat ? Buffer.from(saltText, 'hex') : dummySalt;
  const expected = validFormat ? Buffer.from(hashText, 'hex') : dummyHash;
  const actual = await scrypt(password, salt, expected.length);
  return validFormat && timingSafeEqual(actual, expected);
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function statusFilter(value) {
  const status = value ?? '';
  if (typeof status !== 'string' || (status !== '' && !workflowStatuses.has(status))) {
    const error = new Error('Statut de dossier invalide.');
    error.status = 422;
    throw error;
  }
  return status ? { status } : {};
}

async function scoped(req, res, permission, callback) {
  const userId = req.header('x-user-id');
  const communeId = req.header('x-commune-id');
  if (!userId || !communeId) {
    res.status(403).json({ detail: 'Contexte utilisateur ou territorial manquant' });
    return;
  }
  const assignments = await prisma.affectation.findMany({
    where: {
      utilisateurId: userId,
      communeId,
      active: true,
      utilisateur: { is: { active: true } },
    },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.commune_id', ${communeId}, true)`;
    const commune = await tx.commune.findFirst({ where: { id: communeId, active: true } });
    const assignedCentreIds = [...new Set(assignments.map((item) => item.centreEtatCivilId).filter(Boolean))];
    const activeCentres = assignedCentreIds.length
      ? await tx.centreEtatCivil.findMany({
        where: { id: { in: assignedCentreIds }, communeId, active: true },
        select: { id: true },
      })
      : [];
    const access = buildTerritorialAccess(assignments, activeCentres.map((centre) => centre.id));
    const requestScope = access.scopeFor(permission, 'any');
    if (!commune || !requestScope.permitted) {
      const error = new Error('Affectation ou permission territoriale insuffisante');
      error.status = 403;
      throw error;
    }
    const context = {
      userId,
      communeId,
      commune,
      roles: [...new Set(access.validAssignments.map((item) => item.role.code))],
      permissions: access.permissions,
      centreIds: requestScope.centreIds,
      communeWide: requestScope.communeWide,
      scopeFor: access.scopeFor,
    };
    return callback(tx, context);
  });
  res.json(result);
}

function territoryWhere(context, requiredPermissions = null) {
  const scope = requiredPermissions === null
    ? context
    : context.scopeFor(requiredPermissions, 'all');
  return {
    communeId: context.communeId,
    ...(scope.communeWide ? {} : { centreEtatCivilId: { in: scope.centreIds } }),
  };
}

async function selectedCentre(tx, context) {
  const centre = await tx.centreEtatCivil.findFirst({
    where: {
      communeId: context.communeId,
      active: true,
      ...(context.communeWide ? {} : { id: { in: context.centreIds } }),
    },
    orderBy: { code: 'asc' },
  });
  if (!centre) {
    const error = new Error('Aucun centre d’état civil actif n’est affecté à cette commune.');
    error.status = 409;
    throw error;
  }
  return centre;
}

async function selectedCentreAndRegister(tx, context) {
  const centre = await selectedCentre(tx, context);
  const registre = await tx.registre.findFirst({
    where: {
      communeId: context.communeId,
      centreEtatCivilId: centre.id,
      type: 'BIRTH',
      year: new Date().getUTCFullYear(),
      closedAt: null,
    },
    orderBy: { code: 'asc' },
  });
  if (!registre) {
    const error = new Error('Aucun registre de naissance ouvert pour le centre et l’année courante.');
    error.status = 409;
    throw error;
  }
  return { centre, registre };
}

app.post('/internal/auth/login', async (req, res, next) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || username.length > 80 || !password || password.length > 256) {
      await passwordMatches(password, null);
      return res.status(401).json({ detail: 'Identifiants invalides' });
    }

    const user = await prisma.utilisateur.findUnique({
      where: { username },
      include: {
        assignments: {
          where: { active: true },
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });
    if (!await passwordMatches(password, user?.passwordHash) || !user?.active || !user.assignments.length) {
      return res.status(401).json({ detail: 'Identifiants invalides' });
    }
    const communeMap = new Map();
    const assignmentsByCommune = new Map();
    for (const assignment of user.assignments) {
      const group = assignmentsByCommune.get(assignment.communeId) ?? [];
      group.push(assignment);
      assignmentsByCommune.set(assignment.communeId, group);
    }
    const tenantData = new Map();
    for (const [communeId, assignments] of assignmentsByCommune) {
      const centreIds = [...new Set(assignments.map((item) => item.centreEtatCivilId).filter(Boolean))];
      const tenant = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.commune_id', ${communeId}, true)`;
        const commune = await tx.commune.findFirst({ where: { id: communeId, active: true } });
        if (!commune) return null;
        const centres = centreIds.length
          ? await tx.centreEtatCivil.findMany({
            where: { id: { in: centreIds }, communeId, active: true },
            select: { id: true },
          })
          : [];
        return { commune, centreIds: new Set(centres.map((centre) => centre.id)) };
      });
      if (tenant) tenantData.set(communeId, tenant);
    }
    const roles = new Set();
    const permissions = new Set();
    for (const assignment of user.assignments) {
      const tenant = tenantData.get(assignment.communeId);
      if (!tenant || (assignment.centreEtatCivilId && !tenant.centreIds.has(assignment.centreEtatCivilId))) {
        continue;
      }
      roles.add(assignment.role.code);
      for (const rolePermission of assignment.role.permissions) {
        permissions.add(rolePermission.permission.code);
      }
      const item = communeMap.get(assignment.communeId) ?? {
        id: tenant.commune.id,
        code: tenant.commune.code,
        name: tenant.commune.name,
        centres: [],
        roles: [],
        permissions: [],
      };
      if (assignment.centreEtatCivilId && !item.centres.includes(assignment.centreEtatCivilId)) {
        item.centres.push(assignment.centreEtatCivilId);
      }
      if (!item.roles.includes(assignment.role.code)) item.roles.push(assignment.role.code);
      for (const rolePermission of assignment.role.permissions) {
        const code = rolePermission.permission.code;
        if (!item.permissions.includes(code)) item.permissions.push(code);
      }
      communeMap.set(assignment.communeId, item);
    }
    if (!communeMap.size) {
      return res.status(401).json({ detail: 'Identifiants invalides' });
    }
    res.json({
      id: user.id,
      username: user.username,
      roles: [...roles],
      permissions: [...permissions],
      communes: [...communeMap.values()],
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/permissions', (_req, res) => res.json(permissionDescription));

app.post('/internal/users', async (req, res, next) => {
  try {
    await scoped(req, res, 'users:manage', async (tx, context) => {
      const { username, full_name: fullName, password, role_code: roleCode, centre_id: centreId } = req.body ?? {};
      if (typeof username !== 'string' || !/^[A-Za-z0-9._-]{3,80}$/.test(username)
        || typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 160
        || typeof password !== 'string' || password.length < 16 || password.length > 256
        || typeof roleCode !== 'string' || !assignableRoles.has(roleCode)) {
        const error = new Error('Données utilisateur invalides');
        error.status = 422;
        throw error;
      }
      if (roleCode !== 'COMMUNE_ADMIN' && !centreId) {
        const error = new Error('Un centre est requis pour ce rôle');
        error.status = 422;
        throw error;
      }
      if (roleCode === 'COMMUNE_ADMIN' && !centreId && !context.communeWide) {
        const error = new Error('Une affectation communale exige une habilitation communale');
        error.status = 403;
        throw error;
      }
      if (centreId && !context.communeWide && !context.centreIds.includes(centreId)) {
        const error = new Error('Centre non autorisé dans cette commune');
        error.status = 403;
        throw error;
      }
      const role = await tx.role.findUnique({ where: { code: roleCode } });
      if (!role) {
        const error = new Error('Rôle introuvable');
        error.status = 422;
        throw error;
      }
      const centre = centreId
        ? await tx.centreEtatCivil.findFirst({ where: { id: centreId, communeId: context.communeId, active: true } })
        : null;
      if (centreId && !centre) {
        const error = new Error('Centre d’état civil introuvable');
        error.status = 422;
        throw error;
      }
      const user = await tx.utilisateur.create({
        data: {
          username: username.trim(),
          fullName: fullName.trim(),
          passwordHash: await hashPassword(password),
        },
      });
      await tx.affectation.create({ data: {
        utilisateurId: user.id,
        roleId: role.id,
        communeId: context.communeId,
        centreEtatCivilId: centre?.id ?? null,
      } });
      await tx.auditEvent.create({ data: {
        communeId: context.communeId,
        actorId: context.userId,
        actor: context.userId,
        action: 'CREATE_USER',
        resourceType: 'Utilisateur',
        resourceId: user.id,
        details: { role: role.code, centreId: centre?.id ?? null },
      } });
      return { id: user.id, username: user.username, full_name: user.fullName, role: role.code };
    });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.status(409).json({ detail: 'Cet identifiant utilisateur existe déjà.' });
    }
    next(error);
  }
});

app.get('/internal/users', async (req, res, next) => {
  try {
    await scoped(req, res, 'users:manage', async (tx, context) => {
      const assignments = await tx.affectation.findMany({
        where: {
          communeId: context.communeId,
          active: true,
          ...(context.communeWide ? {} : { centreEtatCivilId: { in: context.centreIds } }),
          utilisateur: { is: { active: true } },
        },
        include: {
          utilisateur: { select: { id: true, username: true, fullName: true, active: true } },
          role: { select: { code: true, name: true } },
          centre: { select: { id: true, code: true, name: true } },
        },
      });
      const users = new Map();
      for (const assignment of assignments) {
        const user = users.get(assignment.utilisateurId) ?? {
          id: assignment.utilisateur.id,
          username: assignment.utilisateur.username,
          full_name: assignment.utilisateur.fullName,
          roles: [],
          centres: [],
        };
        if (!user.roles.some((role) => role.code === assignment.role.code)) {
          user.roles.push(assignment.role);
        }
        const centre = assignment.centre
          ? { id: assignment.centre.id, code: assignment.centre.code, name: assignment.centre.name }
          : { id: null, code: null, name: 'Toute la commune' };
        if (!user.centres.some((item) => item.id === centre.id && item.name === centre.name)) {
          user.centres.push(centre);
        }
        users.set(user.id, user);
      }
      return [...users.values()].sort((left, right) => left.username.localeCompare(right.username));
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/user-options', async (req, res, next) => {
  try {
    await scoped(req, res, 'users:manage', async (tx, context) => {
      const [roles, centres] = await Promise.all([
        tx.role.findMany({
          where: { code: { in: [...assignableRoles] } },
          select: { code: true, name: true },
          orderBy: { code: 'asc' },
        }),
        tx.centreEtatCivil.findMany({
          where: {
            communeId: context.communeId,
            active: true,
            ...(context.communeWide ? {} : { id: { in: context.centreIds } }),
          },
          select: { id: true, code: true, name: true },
          orderBy: { code: 'asc' },
        }),
      ]);
      return { roles, centres };
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/summary', async (req, res, next) => {
  try {
    await scoped(req, res, 'dashboard:read', async (tx, context) => {
      const citizenWhere = territoryWhere(context, ['dashboard:read', 'citizens:read']);
      const birthWhere = territoryWhere(context, ['dashboard:read', 'births:read']);
      const cinWhere = territoryWhere(context, ['dashboard:read', 'cin:read']);
      const deliveryWhere = territoryWhere(context, ['dashboard:read', 'documents:deliver']);
      const canReadCitizens = context.permissions.has('citizens:read');
      const canReadBirths = context.permissions.has('births:read');
      const canReadCin = context.permissions.has('cin:read');
      const canDeliverDocuments = context.permissions.has('documents:deliver');
      const [citizens, declarations, validatedActs, documentsDelivered, births, cinCases,
        activeBirths, activeCin, lastBirths, lastCin] = await Promise.all([
        canReadCitizens ? tx.citizen.count({ where: { ...citizenWhere, active: true } }) : 0,
        canReadBirths ? tx.birthDeclaration.count({ where: birthWhere }) : 0,
        canReadBirths ? tx.birthRecord.count({ where: { ...birthWhere, status: { in: ['VALIDATED', 'ISSUED'] } } }) : 0,
        canDeliverDocuments ? tx.documentDelivery.count({ where: deliveryWhere }) : 0,
        canReadBirths ? tx.birthRecord.count({ where: birthWhere }) : 0,
        canReadCin ? tx.cinApplication.count({ where: cinWhere }) : 0,
        canReadBirths ? tx.birthRecord.count({ where: { ...birthWhere, status: { in: ['REGISTERED', 'IN_REVIEW', 'VALIDATED'] } } }) : 0,
        canReadCin ? tx.cinApplication.count({ where: { ...cinWhere, status: { in: ['REGISTERED', 'IN_REVIEW', 'VALIDATED'] } } }) : 0,
        canReadBirths ? tx.birthRecord.findMany({
          where: birthWhere, include: birthInclude, orderBy: { createdAt: 'desc' }, take: 5,
        }) : [],
        canReadCin ? tx.cinApplication.findMany({
          where: cinWhere, include: { commune: true, centre: true },
          orderBy: { createdAt: 'desc' }, take: 5,
        }) : [],
      ]);
      const recent = [
        ...lastBirths.map((record) => ({
          id: record.id, number: record.recordNumber, type: 'Naissance',
          citizen: `${record.lastName} ${record.firstNames}`, status: record.status,
          created_at: record.createdAt.toISOString(), url: `/naissances/${record.id}`,
        })),
        ...lastCin.map((record) => ({
          id: record.id, number: record.fileNumber, type: 'CIN',
          citizen: `${record.lastName} ${record.firstNames}`, status: record.status,
          created_at: record.createdAt.toISOString(), url: `/cin/${record.id}`,
        })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
      return {
        citizens, declarations, validated_acts: validatedActs, documents_delivered: documentsDelivered,
        births, cin_cases: cinCases, pending: activeBirths + activeCin,
        delivered: documentsDelivered, recent,
      };
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/reports', async (req, res, next) => {
  try {
    await scoped(req, res, 'dashboard:read', async (tx, context) => {
      let period;
      try {
        period = reportPeriod(req.query.start_date, req.query.end_date);
      } catch (error) {
        error.status = 422;
        throw error;
      }
      const periodWhere = { createdAt: { gte: period.startAt, lt: period.endExclusive } };
      const [birthGroups, cinGroups] = await Promise.all([
        tx.birthRecord.groupBy({ by: ['status'], where: {
          ...territoryWhere(context, ['dashboard:read', 'births:read']), ...periodWhere,
        }, _count: { _all: true } }),
        tx.cinApplication.groupBy({ by: ['status'], where: {
          ...territoryWhere(context, ['dashboard:read', 'cin:read']), ...periodWhere,
        }, _count: { _all: true } }),
      ]);
      return summarizeWorkflowCounts(birthGroups, cinGroups, period);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/citizens', async (req, res, next) => {
  try {
    await scoped(req, res, 'citizens:read', async (tx, context) => {
      const q = safeQuery(req.query.q);
      const pagination = parsePagination(req.query);
      const where = {
        ...territoryWhere(context),
        active: true,
        ...(q ? { OR: [
          { lastName: { contains: q, mode: 'insensitive' } },
          { firstNames: { contains: q, mode: 'insensitive' } },
          { birthPlace: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      };
      const [total, rows] = await Promise.all([
        tx.citizen.count({ where }),
        tx.citizen.findMany({
          where,
          include: citizenInclude,
          orderBy: [{ lastName: 'asc' }, { firstNames: 'asc' }, { id: 'asc' }],
          skip: pagination.skip,
          take: pagination.take,
        }),
      ]);
      return pageResult(rows.map(citizenJson), total, pagination);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/citizens/:id', async (req, res, next) => {
  try {
    await scoped(req, res, 'citizens:read', async (tx, context) => {
      const row = await tx.citizen.findFirst({
        where: { id: req.params.id, ...territoryWhere(context) },
        include: citizenInclude,
      });
      if (!row) {
        const error = new Error('Citoyen introuvable');
        error.status = 404;
        throw error;
      }
      return citizenJson(row);
    });
  } catch (error) {
    next(error);
  }
});

app.post('/internal/citizens', async (req, res, next) => {
  try {
    await scoped(req, res, 'citizens:manage', async (tx, context) => {
      const centre = await selectedCentre(tx, context);
      const body = req.body;
      const citizen = await tx.citizen.create({
        data: {
          communeId: context.communeId,
          centreEtatCivilId: centre.id,
          lastName: body.last_name,
          firstNames: body.first_names,
          sex: body.sex === 'M' ? 'MALE' : 'FEMALE',
          birthDate: new Date(`${body.birth_date}T00:00:00.000Z`),
          nationality: body.nationality,
          birthPlace: body.birth_place,
        },
        include: citizenInclude,
      });
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId,
        actor: context.userId, action: 'CREATE_CITIZEN',
        resourceType: 'Citizen', resourceId: citizen.id,
        details: { centreId: centre.id },
      } });
      return citizenJson(citizen);
    });
  } catch (error) {
    next(error);
  }
});

app.put('/internal/citizens/:id', async (req, res, next) => {
  try {
    await scoped(req, res, 'citizens:manage', async (tx, context) => {
      const where = { id: req.params.id, ...territoryWhere(context) };
      const existing = await tx.citizen.findFirst({ where });
      if (!existing) {
        const error = new Error('Citoyen introuvable');
        error.status = 404;
        throw error;
      }
      if (!existing.active) {
        const error = new Error('Un citoyen archivé ne peut pas être modifié.');
        error.status = 409;
        throw error;
      }
      const body = req.body;
      const citizen = await tx.citizen.update({
        where: { id: existing.id },
        data: {
          lastName: body.last_name,
          firstNames: body.first_names,
          sex: body.sex === 'M' ? 'MALE' : 'FEMALE',
          birthDate: new Date(`${body.birth_date}T00:00:00.000Z`),
          nationality: body.nationality,
          birthPlace: body.birth_place,
        },
        include: citizenInclude,
      });
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId,
        actor: context.userId, action: 'UPDATE_CITIZEN',
        resourceType: 'Citizen', resourceId: citizen.id,
        details: { fields: ['lastName', 'firstNames', 'sex', 'birthDate', 'nationality', 'birthPlace'] },
      } });
      return citizenJson(citizen);
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/internal/citizens/:id', async (req, res, next) => {
  try {
    await scoped(req, res, 'citizens:manage', async (tx, context) => {
      const citizen = await tx.citizen.findFirst({
        where: { id: req.params.id, ...territoryWhere(context) },
      });
      if (!citizen) {
        const error = new Error('Citoyen introuvable');
        error.status = 404;
        throw error;
      }
      if (!citizen.active) return { id: citizen.id, active: false };
      await tx.citizen.update({ where: { id: citizen.id }, data: { active: false } });
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId,
        actor: context.userId, action: 'ARCHIVE_CITIZEN',
        resourceType: 'Citizen', resourceId: citizen.id,
        details: { linkedBirthRecords: await tx.birthRecord.count({ where: { citoyenId: citizen.id } }) },
      } });
      return { id: citizen.id, active: false };
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/births', async (req, res, next) => {
  try {
    await scoped(req, res, 'births:read', async (tx, context) => {
      const q = safeQuery(req.query.q);
      const selectedStatus = statusFilter(req.query.status);
      const pagination = parsePagination(req.query);
      const where = {
        ...territoryWhere(context),
        ...selectedStatus,
        ...(q ? { OR: [
          { lastName: { contains: q, mode: 'insensitive' } },
          { firstNames: { contains: q, mode: 'insensitive' } },
          { recordNumber: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      };
      const [total, rows] = await Promise.all([
        tx.birthRecord.count({ where }),
        tx.birthRecord.findMany({
          where,
          include: birthInclude,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: pagination.skip,
          take: pagination.take,
        }),
      ]);
      return pageResult(rows.map(birthJson), total, pagination);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/births/:id', async (req, res, next) => {
  try {
    await scoped(req, res, 'births:read', async (tx, context) => {
      const row = await tx.birthRecord.findFirst({
        where: { id: req.params.id, ...territoryWhere(context) },
        include: birthInclude,
      });
      if (!row) {
        const error = new Error('Acte introuvable');
        error.status = 404;
        throw error;
      }
      return birthJson(row);
    });
  } catch (error) {
    next(error);
  }
});

app.post('/internal/births', async (req, res, next) => {
  try {
    await scoped(req, res, 'births:create', async (tx, context) => {
      const body = req.body;
      const { centre, registre } = await selectedCentreAndRegister(tx, context);
      const citizen = await tx.citizen.create({ data: {
        communeId: context.communeId, centreEtatCivilId: centre.id,
        lastName: body.last_name, firstNames: body.first_names,
        sex: body.sex === 'M' ? 'MALE' : 'FEMALE',
        birthDate: new Date(`${body.birth_date}T00:00:00.000Z`),
        nationality: body.nationality, birthPlace: body.place_of_birth,
      } });
      const declaration = await tx.birthDeclaration.create({ data: {
        communeId: context.communeId, centreEtatCivilId: centre.id,
        registreId: registre.id, citoyenId: citizen.id,
        status: 'SUBMITTED', declarantName: body.declarant_name || null,
        submittedAt: new Date(), createdById: context.userId,
        events: { create: {
          actorId: context.userId,
          action: 'SUBMIT', toStatus: 'SUBMITTED',
        } },
      } });
      const created = await tx.birthRecord.create({ data: {
        recordNumber: makeDemoNumber('NAI'), communeId: context.communeId,
        centreEtatCivilId: centre.id, registreId: registre.id,
        citoyenId: citizen.id, declarationId: declaration.id,
        lastName: body.last_name, firstNames: body.first_names,
        sex: body.sex === 'M' ? 'MALE' : 'FEMALE',
        birthDate: citizen.birthDate, nationality: body.nationality,
        district: body.district, municipality: context.commune.name,
        placeOfBirth: body.place_of_birth,
        fatherName: body.father_name || null, motherName: body.mother_name || null,
        address: body.address || null, declarantName: body.declarant_name || null,
        officeCode: centre.code, status: 'REGISTERED',
      }, include: birthInclude });
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId,
        actor: context.userId, action: 'CREATE_DECLARATION',
        resourceType: 'BirthDeclaration', resourceId: declaration.id,
        details: { birthRecordId: created.id, registerId: registre.id, centreId: centre.id },
      } });
      return birthJson(created);
    });
  } catch (error) {
    next(error);
  }
});

app.post('/internal/births/:id/transition', async (req, res, next) => {
  try {
    const transitions = {
      IN_REVIEW: { from: ['REGISTERED'], permission: 'births:workflow' },
      VALIDATED: { from: ['IN_REVIEW'], permission: 'births:workflow' },
      REJECTED: { from: ['REGISTERED', 'IN_REVIEW'], permission: 'births:workflow' },
      ISSUED: { from: ['VALIDATED'], permission: 'documents:deliver' },
    };
    const transition = transitions[req.body?.status];
    if (!transition) return res.status(422).json({ detail: 'Transition de workflow non autorisée' });
    if (req.body.status === 'REJECTED' && (typeof req.body.reason !== 'string' || req.body.reason.trim().length < 5)) {
      return res.status(422).json({ detail: 'Le motif du rejet doit contenir au moins 5 caractères.' });
    }
    const result = await scoped(req, res, transition.permission, async (tx, context) => {
      const record = await tx.birthRecord.findFirst({
        where: { id: req.params.id, ...territoryWhere(context) },
      });
      if (!record) {
        const error = new Error('Dossier introuvable');
        error.status = 404;
        throw error;
      }
      if (!transition.from.includes(record.status)) {
        const error = new Error(`Transition impossible depuis le statut ${record.status}`);
        error.status = 409;
        throw error;
      }
      const changed = await tx.birthRecord.updateMany({
        where: {
          id: record.id, ...territoryWhere(context),
          status: record.status, updatedAt: record.updatedAt,
        },
        data: { status: req.body.status },
      });
      if (changed.count !== 1) {
        const error = new Error('Le statut a changé. Rechargez le dossier.');
        error.status = 409;
        throw error;
      }
      const updated = await tx.birthRecord.findFirst({
        where: { id: record.id, ...territoryWhere(context) },
        include: birthInclude,
      });
      const declarationStatus = req.body.status === 'ISSUED' ? 'VALIDATED' : req.body.status;
      if (record.declarationId) {
        const declaration = await tx.birthDeclaration.findFirst({
          where: { id: record.declarationId, communeId: context.communeId },
        });
        if (declaration && declaration.status !== declarationStatus) {
          await tx.birthDeclaration.update({
            where: { id: declaration.id },
            data: {
              status: declarationStatus,
              ...(req.body.status === 'VALIDATED' ? { validatedAt: new Date() } : {}),
              ...(req.body.status === 'REJECTED' ? {
                rejectedAt: new Date(),
                rejectionReason: typeof req.body.reason === 'string' ? req.body.reason.slice(0, 500) : null,
              } : {}),
            },
          });
          await tx.workflowEvent.create({ data: {
            communeId: context.communeId, declarationId: declaration.id,
            actorId: context.userId, action: req.body.status,
            fromStatus: declaration.status, toStatus: declarationStatus,
          } });
        }
      }
      if (req.body.status === 'ISSUED') {
        await tx.documentDelivery.create({ data: {
          ...territoryWhere(context),
          centreEtatCivilId: record.centreEtatCivilId,
          birthRecordId: record.id,
          deliveredById: context.userId,
          documentType: 'BIRTH_CERTIFICATE_SPECIMEN',
        } });
      }
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId, actor: context.userId,
        action: req.body.status, resourceType: 'BirthRecord', resourceId: record.id,
        details: { from: record.status, to: req.body.status },
      } });
      return birthJson(updated);
    });
    if (!res.headersSent) res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/internal/cin', async (req, res, next) => {
  try {
    await scoped(req, res, 'cin:read', async (tx, context) => {
      const q = safeQuery(req.query.q);
      const selectedStatus = statusFilter(req.query.status);
      const pagination = parsePagination(req.query);
      const where = {
        ...territoryWhere(context),
        ...selectedStatus,
        ...(q ? { OR: [
          { lastName: { contains: q, mode: 'insensitive' } },
          { firstNames: { contains: q, mode: 'insensitive' } },
          { fileNumber: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      };
      const [total, rows] = await Promise.all([
        tx.cinApplication.count({ where }),
        tx.cinApplication.findMany({
          where,
          include: { commune: true, centre: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: pagination.skip,
          take: pagination.take,
        }),
      ]);
      return pageResult(rows.map(cinJson), total, pagination);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/requests', async (req, res, next) => {
  try {
    await scoped(req, res, ['births:read', 'cin:read'], async (tx, context) => {
      const q = safeQuery(req.query.q);
      const type = req.query.type ?? 'all';
      const status = req.query.status ?? '';
      const allowedTypes = new Set(['all', 'births', 'cin']);
      if (typeof type !== 'string' || !allowedTypes.has(type)) {
        const error = new Error('Type de demande invalide.');
        error.status = 422;
        throw error;
      }
      const selectedStatus = requestScopeFilter(req.query.scope ?? 'all', status);
      const pagination = parsePagination(req.query);
      const canReadBirths = context.permissions.has('births:read') && type !== 'cin';
      const canReadCin = context.permissions.has('cin:read') && type !== 'births';
      const birthWhere = {
        ...territoryWhere(context, 'births:read'),
        ...selectedStatus,
        ...(q ? { OR: [
          { lastName: { contains: q, mode: 'insensitive' } },
          { firstNames: { contains: q, mode: 'insensitive' } },
          { recordNumber: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      };
      const cinWhere = {
        ...territoryWhere(context, 'cin:read'),
        ...selectedStatus,
        ...(q ? { OR: [
          { lastName: { contains: q, mode: 'insensitive' } },
          { firstNames: { contains: q, mode: 'insensitive' } },
          { fileNumber: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      };
      const take = pagination.skip + pagination.take;
      const [birthCount, cinCount, births, cinRows] = await Promise.all([
        canReadBirths ? tx.birthRecord.count({ where: birthWhere }) : 0,
        canReadCin ? tx.cinApplication.count({ where: cinWhere }) : 0,
        canReadBirths ? tx.birthRecord.findMany({
          where: birthWhere, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take, include: birthInclude,
        }) : [],
        canReadCin ? tx.cinApplication.findMany({
          where: cinWhere, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take, include: { commune: true, centre: true },
        }) : [],
      ]);
      const items = [
        ...births.map((record) => ({
          id: record.id,
          number: record.recordNumber,
          type: 'Naissance',
          citizen: `${record.lastName} ${record.firstNames}`,
          status: record.status,
          created_at: record.createdAt.toISOString(),
          url: `/naissances/${record.id}`,
        })),
        ...cinRows.map((record) => ({
          id: record.id,
          number: record.fileNumber,
          type: 'CIN',
          citizen: `${record.lastName} ${record.firstNames}`,
          status: record.status,
          created_at: record.createdAt.toISOString(),
          url: `/cin/${record.id}`,
        })),
      ].sort((left, right) =>
        right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
        .slice(pagination.skip, pagination.skip + pagination.take);
      return pageResult(items, birthCount + cinCount, pagination);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/cin/:id', async (req, res, next) => {
  try {
    await scoped(req, res, 'cin:read', async (tx, context) => {
      const row = await tx.cinApplication.findFirst({
        where: { id: req.params.id, ...territoryWhere(context) },
        include: { commune: true, centre: true },
      });
      if (!row) {
        const error = new Error('Dossier CIN introuvable');
        error.status = 404;
        throw error;
      }
      return cinJson(row);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/documents/births/:id', async (req, res, next) => {
  try {
    await scoped(req, res, 'documents:preview', async (tx, context) => {
      if (!context.permissions.has('births:read')) {
        const error = new Error('Permission de consultation des naissances insuffisante');
        error.status = 403;
        throw error;
      }
      const record = await tx.birthRecord.findFirst({
        where: {
          id: req.params.id,
          ...territoryWhere(context, ['documents:preview', 'births:read']),
        },
        include: birthInclude,
      });
      if (!record) {
        const error = new Error('Acte introuvable');
        error.status = 404;
        throw error;
      }
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId, actor: context.userId,
        action: 'EXPORT_DOCUMENT_SPECIMEN', resourceType: 'BirthRecord', resourceId: record.id,
        details: { documentType: 'BIRTH_CERTIFICATE_SPECIMEN', recordNumber: record.recordNumber },
      } });
      return birthJson(record);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/documents/cin/:id', async (req, res, next) => {
  try {
    await scoped(req, res, 'documents:preview', async (tx, context) => {
      if (!context.permissions.has('cin:read')) {
        const error = new Error('Permission de consultation des dossiers CIN insuffisante');
        error.status = 403;
        throw error;
      }
      const record = await tx.cinApplication.findFirst({
        where: {
          id: req.params.id,
          ...territoryWhere(context, ['documents:preview', 'cin:read']),
        },
        include: { commune: true, centre: true },
      });
      if (!record) {
        const error = new Error('Dossier CIN introuvable');
        error.status = 404;
        throw error;
      }
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId, actor: context.userId,
        action: 'EXPORT_DOCUMENT_SPECIMEN', resourceType: 'CinApplication', resourceId: record.id,
        details: { documentType: 'CIN_APPLICATION_SPECIMEN', fileNumber: record.fileNumber },
      } });
      return cinJson(record);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/internal/documents/export', async (req, res, next) => {
  try {
    const exportType = ['all', 'births', 'cin'].includes(req.query.type) ? req.query.type : 'all';
    await scoped(req, res, 'documents:preview', async (tx, context) => {
      if (exportType !== 'cin' && !context.permissions.has('births:read')) {
        const error = new Error('Permission de consultation des naissances insuffisante');
        error.status = 403;
        throw error;
      }
      if (exportType !== 'births' && !context.permissions.has('cin:read')) {
        const error = new Error('Permission de consultation des dossiers CIN insuffisante');
        error.status = 403;
        throw error;
      }

      const birthWhere = territoryWhere(context, ['documents:preview', 'births:read']);
      const cinWhere = territoryWhere(context, ['documents:preview', 'cin:read']);
      const [births, cinCases] = await Promise.all([
        exportType === 'cin' ? [] : tx.birthRecord.findMany({
          where: birthWhere,
          include: birthInclude,
          orderBy: { createdAt: 'asc' },
        }),
        exportType === 'births' ? [] : tx.cinApplication.findMany({
          where: cinWhere,
          include: { commune: true, centre: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);
      const exportId = randomBytes(16).toString('hex');
      await tx.auditEvent.create({ data: {
        communeId: context.communeId,
        actorId: context.userId,
        actor: context.userId,
        action: 'EXPORT_DOCUMENT_SPECIMENS',
        resourceType: 'DocumentExport',
        resourceId: exportId,
        details: {
          types: exportType,
          births: births.length,
          cin: cinCases.length,
          centreIds: context.communeWide ? [] : context.centreIds,
        },
      } });
      return {
        commune: { id: context.commune.id, code: context.commune.code, name: context.commune.name },
        export_id: exportId,
        births: births.map(birthJson),
        cin: cinCases.map(cinJson),
      };
    });
  } catch (error) {
    next(error);
  }
});

app.put('/internal/cin/:id/evidence', async (req, res, next) => {
  try {
    const body = req.body;
    if (typeof body?.has_birth_certificate !== 'boolean'
      || typeof body?.has_residence_proof !== 'boolean'
      || !Number.isInteger(body?.photos_count)
      || body.photos_count < 0 || body.photos_count > 8) {
      return res.status(422).json({ detail: 'Pièces déclarées invalides.' });
    }
    const result = await scoped(req, res, ['cin:create', 'cin:workflow'], async (tx, context) => {
      const record = await tx.cinApplication.findFirst({
        where: {
          id: req.params.id,
          ...territoryWhere(context, ['cin:create', 'cin:workflow']),
        },
      });
      if (!record) {
        const error = new Error('Dossier CIN introuvable.');
        error.status = 404;
        throw error;
      }
      if (!canEditCinEvidence(record.status)) {
        const error = new Error('Les justificatifs ne peuvent plus être modifiés après validation ou clôture.');
        error.status = 409;
        throw error;
      }
      const data = {
        hasBirthCertificate: body.has_birth_certificate,
        hasResidenceProof: body.has_residence_proof,
        photosCount: body.photos_count,
      };
      const updatedCount = await tx.cinApplication.updateMany({
        where: {
          id: record.id,
          ...territoryWhere(context, ['cin:create', 'cin:workflow']),
          status: record.status,
          updatedAt: record.updatedAt,
        },
        data,
      });
      if (updatedCount.count !== 1) {
        const error = new Error('Dossier modifié simultanément : rechargez la fiche.');
        error.status = 409;
        throw error;
      }
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId, actor: context.userId,
        action: 'CIN_EVIDENCE_UPDATED', resourceType: 'CinApplication', resourceId: record.id,
        details: {
          has_birth_certificate: data.hasBirthCertificate,
          has_residence_proof: data.hasResidenceProof,
          photos_count: data.photosCount,
        },
      } });
      return cinJson(await tx.cinApplication.findFirst({
        where: {
          id: record.id,
          ...territoryWhere(context, ['cin:create', 'cin:workflow']),
        },
        include: { commune: true, centre: true },
      }));
    });
    if (!res.headersSent) res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/internal/cin/:id/transition', async (req, res, next) => {
  try {
    const target = req.body?.status;
    const rule = CIN_TRANSITIONS[target];
    if (!rule) return res.status(422).json({ detail: 'Transition CIN inconnue.' });
    const result = await scoped(req, res, rule.permission, async (tx, context) => {
      const record = await tx.cinApplication.findFirst({
        where: { id: req.params.id, ...territoryWhere(context) },
      });
      if (!record) {
        const error = new Error('Dossier CIN introuvable.');
        error.status = 404;
        throw error;
      }
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      checkCinTransition(record, target, reason);
      const changed = await tx.cinApplication.updateMany({
        where: { id: record.id, ...territoryWhere(context), status: record.status, updatedAt: record.updatedAt },
        data: { status: target },
      });
      if (changed.count !== 1) {
        const error = new Error('Le statut a changé. Rechargez le dossier.');
        error.status = 409;
        throw error;
      }
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId, actor: context.userId,
        action: `CIN_${target}`, resourceType: 'CinApplication', resourceId: record.id,
        details: { from: record.status, to: target, ...(reason ? { reason } : {}) },
      } });
      const updated = await tx.cinApplication.findFirst({
        where: { id: record.id, ...territoryWhere(context) },
        include: { commune: true, centre: true },
      });
      return cinJson(updated);
    });
    if (!res.headersSent) res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/internal/cin/:id/history', async (req, res, next) => {
  try {
    await scoped(req, res, 'cin:read', async (tx, context) => {
      const record = await tx.cinApplication.findFirst({
        where: { id: req.params.id, ...territoryWhere(context) },
        select: { id: true },
      });
      if (!record) {
        const error = new Error('Dossier CIN introuvable.');
        error.status = 404;
        throw error;
      }
      const events = await tx.auditEvent.findMany({
        where: { communeId: context.communeId, resourceType: 'CinApplication', resourceId: record.id },
        orderBy: { createdAt: 'desc' },
        take: 40,
        include: { utilisateur: { select: { fullName: true } } },
      });
      return events.map(event => ({
        id: event.id,
        action: event.action,
        actor: event.utilisateur?.fullName ?? 'Agent habilité',
        created_at: event.createdAt.toISOString(),
        from_status: event.details?.from ?? null,
        to_status: event.details?.to ?? null,
        reason: event.details?.reason ?? null,
      }));
    });
  } catch (error) {
    next(error);
  }
});

app.post('/internal/cin', async (req, res, next) => {
  try {
    await scoped(req, res, 'cin:create', async (tx, context) => {
      const centre = await selectedCentre(tx, context);
      const body = req.body;
      const created = await tx.cinApplication.create({ data: {
        fileNumber: makeDemoNumber('CIN'), communeId: context.communeId,
        centreEtatCivilId: centre.id,
        lastName: body.last_name, firstNames: body.first_names,
        birthDate: new Date(`${body.birth_date}T00:00:00.000Z`),
        birthPlace: body.birth_place, address: body.address, district: body.district,
        profession: body.profession || null, fatherName: body.father_name || null,
        motherName: body.mother_name || null,
        hasBirthCertificate: body.has_birth_certificate,
        hasResidenceProof: body.has_residence_proof, photosCount: body.photos_count,
        officeCode: centre.code,
      }, include: { commune: true, centre: true } });
      await tx.auditEvent.create({ data: {
        communeId: context.communeId, actorId: context.userId,
        actor: context.userId, action: 'CREATE',
        resourceType: 'CinApplication', resourceId: created.id,
        details: { number: created.fileNumber },
      } });
      return cinJson(created);
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, _req, res, _next) => {
  console.error('Data-service failure:', err);
  res.status(err.status || 500).json({
    detail: err.status ? err.message : 'Erreur interne du service de données',
  });
});

async function start() {
  await prisma.$connect();
  const [schemaRow] = await prisma.$queryRaw`
    SELECT to_regclass(format('%I.%I', ${schema}::text, 'Commune'))::text AS commune_table
  `;
  if (!schemaRow?.commune_table) {
    throw new Error('Schema is not migrated. Run the controlled Prisma migration procedure before starting.');
  }
  const port = Number(process.env.PORT ?? 4000);
  const server = app.listen(port, '0.0.0.0', () => console.log(`SGAEC data service listening on ${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, async () => {
      server.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  }
}

start().catch(async (error) => {
  console.error('Data-service startup failed:', error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
