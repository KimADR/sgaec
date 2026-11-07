ALTER TABLE "Citizen"
    ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Citizen_communeId_active_lastName_firstNames_idx"
    ON "Citizen"("communeId", "active", "lastName", "firstNames");

INSERT INTO "Permission" ("id", "code", "description")
VALUES (gen_random_uuid()::text, 'citizens:manage', 'Créer, modifier et archiver les citoyens')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", permission."id"
FROM "Role" r
CROSS JOIN "Permission" permission
WHERE r."code" IN ('COMMUNE_ADMIN', 'AGENT_SAISIE')
  AND permission."code" = 'citizens:manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
