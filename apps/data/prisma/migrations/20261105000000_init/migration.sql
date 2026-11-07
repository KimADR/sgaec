-- Prototype de démonstration, aucun document généré n'a de valeur officielle.
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "WorkflowStatus" AS ENUM ('REGISTERED', 'IN_REVIEW', 'VALIDATED', 'ISSUED', 'REJECTED');

CREATE TABLE "BirthRecord" (
    "id" TEXT NOT NULL,
    "recordNumber" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstNames" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "birthDate" DATE NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Malagasy',
    "district" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "placeOfBirth" TEXT NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "address" TEXT,
    "declarantName" TEXT,
    "officeCode" TEXT NOT NULL DEFAULT 'ANT-II',
    "status" "WorkflowStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BirthRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BirthRecord_recordNumber_key" ON "BirthRecord"("recordNumber");
CREATE INDEX "BirthRecord_lastName_firstNames_idx" ON "BirthRecord"("lastName", "firstNames");
CREATE INDEX "BirthRecord_officeCode_createdAt_idx" ON "BirthRecord"("officeCode", "createdAt");

CREATE TABLE "CinApplication" (
    "id" TEXT NOT NULL,
    "fileNumber" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstNames" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "birthPlace" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "profession" TEXT,
    "fatherName" TEXT,
    "motherName" TEXT,
    "hasBirthCertificate" BOOLEAN NOT NULL DEFAULT false,
    "hasResidenceProof" BOOLEAN NOT NULL DEFAULT false,
    "photosCount" INTEGER NOT NULL DEFAULT 0,
    "officeCode" TEXT NOT NULL DEFAULT 'ANT-II',
    "status" "WorkflowStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CinApplication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CinApplication_fileNumber_key" ON "CinApplication"("fileNumber");
CREATE INDEX "CinApplication_lastName_firstNames_idx" ON "CinApplication"("lastName", "firstNames");
CREATE INDEX "CinApplication_officeCode_createdAt_idx" ON "CinApplication"("officeCode", "createdAt");

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditEvent_resourceType_resourceId_idx" ON "AuditEvent"("resourceType", "resourceId");
