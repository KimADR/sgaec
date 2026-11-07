-- Migration contrôlée et additive. Prévoir un pg_dump vérifié et un contrôle
-- des lignes existantes avant son exécution explicite.
CREATE TYPE "DeclarationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VALIDATED', 'REJECTED');
CREATE TYPE "RegisterType" AS ENUM ('BIRTH', 'MARRIAGE', 'DEATH');

CREATE TABLE "Commune" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Commune_code_key" ON "Commune"("code");

CREATE TABLE "Arrondissement" (
    "id" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Arrondissement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Arrondissement_communeId_code_key" ON "Arrondissement"("communeId", "code");
CREATE UNIQUE INDEX "Arrondissement_id_communeId_key" ON "Arrondissement"("id", "communeId");

CREATE TABLE "CentreEtatCivil" (
    "id" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "arrondissementId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CentreEtatCivil_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CentreEtatCivil_communeId_code_key" ON "CentreEtatCivil"("communeId", "code");
CREATE UNIQUE INDEX "CentreEtatCivil_id_communeId_key" ON "CentreEtatCivil"("id", "communeId");

CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Utilisateur_username_key" ON "Utilisateur"("username");

CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "Affectation" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "centreEtatCivilId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Affectation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Affectation_utilisateurId_roleId_communeId_centreEtatCivilId_key"
    ON "Affectation"("utilisateurId", "roleId", "communeId", "centreEtatCivilId");
CREATE INDEX "Affectation_utilisateurId_communeId_active_idx"
    ON "Affectation"("utilisateurId", "communeId", "active");

CREATE TABLE "Registre" (
    "id" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "centreEtatCivilId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "RegisterType" NOT NULL,
    "year" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "Registre_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Registre_communeId_code_key" ON "Registre"("communeId", "code");
CREATE UNIQUE INDEX "Registre_id_communeId_key" ON "Registre"("id", "communeId");
CREATE INDEX "Registre_communeId_centreEtatCivilId_type_year_idx"
    ON "Registre"("communeId", "centreEtatCivilId", "type", "year");

CREATE TABLE "Citizen" (
    "id" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "centreEtatCivilId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstNames" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "birthDate" DATE NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Malagasy',
    "birthPlace" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Citizen_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Citizen_communeId_lastName_firstNames_idx" ON "Citizen"("communeId", "lastName", "firstNames");
CREATE UNIQUE INDEX "Citizen_id_communeId_key" ON "Citizen"("id", "communeId");

CREATE TABLE "BirthDeclaration" (
    "id" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "centreEtatCivilId" TEXT NOT NULL,
    "registreId" TEXT NOT NULL,
    "citoyenId" TEXT NOT NULL,
    "status" "DeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "declarantName" TEXT,
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BirthDeclaration_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BirthDeclaration_communeId_centreEtatCivilId_status_createdAt_idx"
    ON "BirthDeclaration"("communeId", "centreEtatCivilId", "status", "createdAt");

CREATE TABLE "DocumentDelivery" (
    "id" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "centreEtatCivilId" TEXT NOT NULL,
    "birthRecordId" TEXT NOT NULL,
    "deliveredById" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DocumentDelivery_communeId_deliveredAt_idx" ON "DocumentDelivery"("communeId", "deliveredAt");

CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "declarationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "DeclarationStatus",
    "toStatus" "DeclarationStatus" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkflowEvent_communeId_declarationId_createdAt_idx"
    ON "WorkflowEvent"("communeId", "declarationId", "createdAt");

ALTER TABLE "AuditEvent" ADD COLUMN "communeId" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "actorId" TEXT;

-- Identifiants fixes pour rendre l'amorçage idempotent sans toucher aux données.
INSERT INTO "Commune" ("id", "code", "name") VALUES
    ('00000000-0000-4000-8000-000000000001', 'LEGACY_ANTANANARIVO_DEMO', 'Commune historique de démonstration'),
    ('00000000-0000-4000-8000-000000000002', 'COMMUNE_DEMO_A', 'Commune fictive A'),
    ('00000000-0000-4000-8000-000000000003', 'COMMUNE_DEMO_B', 'Commune fictive B');

INSERT INTO "Arrondissement" ("id", "communeId", "code", "name") VALUES
    ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'ANT-II-DEMO', 'Arrondissement historique de démonstration'),
    ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000002', 'A-DEMO', 'Arrondissement A fictif'),
    ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000003', 'B-DEMO', 'Arrondissement B fictif');

INSERT INTO "CentreEtatCivil" ("id", "communeId", "arrondissementId", "code", "name") VALUES
    ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'CENTRE-LEGACY-DEMO', 'Centre de démonstration historique'),
    ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000102', 'CENTRE-A-DEMO', 'Centre fictif A'),
    ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000103', 'CENTRE-B-DEMO', 'Centre fictif B');

INSERT INTO "Registre" ("id", "communeId", "centreEtatCivilId", "code", "type", "year") VALUES
    ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201', 'REG-LEGACY-DEMO', 'BIRTH', 2026),
    ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000202', 'REG-A-DEMO-2026', 'BIRTH', 2026),
    ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000203', 'REG-B-DEMO-2026', 'BIRTH', 2026);

ALTER TABLE "BirthRecord" ADD COLUMN "communeId" TEXT;
ALTER TABLE "BirthRecord" ADD COLUMN "centreEtatCivilId" TEXT;
ALTER TABLE "BirthRecord" ADD COLUMN "registreId" TEXT;
ALTER TABLE "BirthRecord" ADD COLUMN "citoyenId" TEXT;
ALTER TABLE "BirthRecord" ADD COLUMN "declarationId" TEXT;

ALTER TABLE "CinApplication" ADD COLUMN "communeId" TEXT;
ALTER TABLE "CinApplication" ADD COLUMN "centreEtatCivilId" TEXT;

INSERT INTO "Citizen" (
    "id", "communeId", "centreEtatCivilId", "lastName", "firstNames", "sex",
    "birthDate", "nationality", "birthPlace", "createdAt", "updatedAt"
)
SELECT
    b."id", '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000201',
    b."lastName", b."firstNames", b."sex", b."birthDate", b."nationality",
    b."placeOfBirth", b."createdAt", b."updatedAt"
FROM "BirthRecord" b;

INSERT INTO "BirthDeclaration" (
    "id", "communeId", "centreEtatCivilId", "registreId", "citoyenId", "status",
    "declarantName", "createdAt", "updatedAt"
)
SELECT
    'legacy-' || b."id", '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000301',
    b."id",
    CASE b."status"::text
        WHEN 'IN_REVIEW' THEN 'IN_REVIEW'::"DeclarationStatus"
        WHEN 'VALIDATED' THEN 'VALIDATED'::"DeclarationStatus"
        WHEN 'ISSUED' THEN 'VALIDATED'::"DeclarationStatus"
        WHEN 'REJECTED' THEN 'REJECTED'::"DeclarationStatus"
        ELSE 'SUBMITTED'::"DeclarationStatus"
    END,
    b."declarantName", b."createdAt", b."updatedAt"
FROM "BirthRecord" b;

UPDATE "BirthRecord" SET
    "communeId" = '00000000-0000-4000-8000-000000000001',
    "centreEtatCivilId" = '00000000-0000-4000-8000-000000000201',
    "registreId" = '00000000-0000-4000-8000-000000000301',
    "citoyenId" = "id",
    "declarationId" = 'legacy-' || "id";

UPDATE "CinApplication" SET
    "communeId" = '00000000-0000-4000-8000-000000000001',
    "centreEtatCivilId" = '00000000-0000-4000-8000-000000000201';

UPDATE "AuditEvent" SET "communeId" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "BirthRecord" ALTER COLUMN "communeId" SET NOT NULL;
ALTER TABLE "BirthRecord" ALTER COLUMN "centreEtatCivilId" SET NOT NULL;
ALTER TABLE "BirthRecord" ALTER COLUMN "registreId" SET NOT NULL;
ALTER TABLE "BirthRecord" ALTER COLUMN "citoyenId" SET NOT NULL;
ALTER TABLE "CinApplication" ALTER COLUMN "communeId" SET NOT NULL;
ALTER TABLE "CinApplication" ALTER COLUMN "centreEtatCivilId" SET NOT NULL;
ALTER TABLE "AuditEvent" ALTER COLUMN "communeId" SET NOT NULL;

CREATE UNIQUE INDEX "BirthDeclaration_id_communeId_key" ON "BirthDeclaration"("id", "communeId");
CREATE UNIQUE INDEX "BirthRecord_id_communeId_key" ON "BirthRecord"("id", "communeId");
CREATE UNIQUE INDEX "BirthRecord_declarationId_key" ON "BirthRecord"("declarationId");
CREATE UNIQUE INDEX "BirthRecord_declarationId_communeId_key" ON "BirthRecord"("declarationId", "communeId");

ALTER TABLE "Arrondissement" ADD CONSTRAINT "Arrondissement_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CentreEtatCivil" ADD CONSTRAINT "CentreEtatCivil_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CentreEtatCivil" ADD CONSTRAINT "CentreEtatCivil_arrondissementId_communeId_fkey"
    FOREIGN KEY ("arrondissementId", "communeId") REFERENCES "Arrondissement"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_utilisateurId_fkey"
    FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_centreEtatCivilId_communeId_fkey"
    FOREIGN KEY ("centreEtatCivilId", "communeId") REFERENCES "CentreEtatCivil"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Registre" ADD CONSTRAINT "Registre_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Registre" ADD CONSTRAINT "Registre_centreEtatCivilId_communeId_fkey"
    FOREIGN KEY ("centreEtatCivilId", "communeId") REFERENCES "CentreEtatCivil"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_centreEtatCivilId_communeId_fkey"
    FOREIGN KEY ("centreEtatCivilId", "communeId") REFERENCES "CentreEtatCivil"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthDeclaration" ADD CONSTRAINT "BirthDeclaration_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthDeclaration" ADD CONSTRAINT "BirthDeclaration_centreEtatCivilId_communeId_fkey"
    FOREIGN KEY ("centreEtatCivilId", "communeId") REFERENCES "CentreEtatCivil"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthDeclaration" ADD CONSTRAINT "BirthDeclaration_registreId_communeId_fkey"
    FOREIGN KEY ("registreId", "communeId") REFERENCES "Registre"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthDeclaration" ADD CONSTRAINT "BirthDeclaration_citoyenId_fkey"
    FOREIGN KEY ("citoyenId", "communeId") REFERENCES "Citizen"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthDeclaration" ADD CONSTRAINT "BirthDeclaration_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthRecord" ADD CONSTRAINT "BirthRecord_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthRecord" ADD CONSTRAINT "BirthRecord_centreEtatCivilId_communeId_fkey"
    FOREIGN KEY ("centreEtatCivilId", "communeId") REFERENCES "CentreEtatCivil"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthRecord" ADD CONSTRAINT "BirthRecord_registreId_communeId_fkey"
    FOREIGN KEY ("registreId", "communeId") REFERENCES "Registre"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthRecord" ADD CONSTRAINT "BirthRecord_citoyenId_fkey"
    FOREIGN KEY ("citoyenId", "communeId") REFERENCES "Citizen"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BirthRecord" ADD CONSTRAINT "BirthRecord_declarationId_fkey"
    FOREIGN KEY ("declarationId", "communeId") REFERENCES "BirthDeclaration"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CinApplication" ADD CONSTRAINT "CinApplication_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CinApplication" ADD CONSTRAINT "CinApplication_centreEtatCivilId_communeId_fkey"
    FOREIGN KEY ("centreEtatCivilId", "communeId") REFERENCES "CentreEtatCivil"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentDelivery" ADD CONSTRAINT "DocumentDelivery_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentDelivery" ADD CONSTRAINT "DocumentDelivery_centreEtatCivilId_communeId_fkey"
    FOREIGN KEY ("centreEtatCivilId", "communeId") REFERENCES "CentreEtatCivil"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentDelivery" ADD CONSTRAINT "DocumentDelivery_birthRecordId_communeId_fkey"
    FOREIGN KEY ("birthRecordId", "communeId") REFERENCES "BirthRecord"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentDelivery" ADD CONSTRAINT "DocumentDelivery_deliveredById_fkey"
    FOREIGN KEY ("deliveredById") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_declarationId_fkey"
    FOREIGN KEY ("declarationId", "communeId") REFERENCES "BirthDeclaration"("id", "communeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_communeId_fkey"
    FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'Commune', 'Arrondissement', 'CentreEtatCivil', 'Registre', 'Citizen',
        'BirthDeclaration', 'BirthRecord', 'CinApplication', 'DocumentDelivery',
        'WorkflowEvent', 'AuditEvent'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
        IF table_name = 'Commune' THEN
            EXECUTE format(
                'CREATE POLICY commune_isolation ON %I USING ("id" = current_setting(''app.commune_id'', true)) WITH CHECK ("id" = current_setting(''app.commune_id'', true))',
                table_name
            );
        ELSE
            EXECUTE format(
                'CREATE POLICY commune_isolation ON %I USING ("communeId" = current_setting(''app.commune_id'', true)) WITH CHECK ("communeId" = current_setting(''app.commune_id'', true))',
                table_name
            );
        END IF;
    END LOOP;
END $$;
