-- Extend existing shared profile enum from 3 to 5 slots
ALTER TYPE "SharedProfile" ADD VALUE IF NOT EXISTS 'D';
ALTER TYPE "SharedProfile" ADD VALUE IF NOT EXISTS 'E';

-- Create named profiles owned by users
CREATE TABLE "UserSharedProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "code" "SharedProfile" NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserSharedProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSharedProfile_userId_code_key"
ON "UserSharedProfile"("userId", "code");

CREATE INDEX "UserSharedProfile_userId_idx"
ON "UserSharedProfile"("userId");

ALTER TABLE "UserSharedProfile"
ADD CONSTRAINT "UserSharedProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default profile A for already shared accounts
INSERT INTO "UserSharedProfile" ("id", "userId", "code", "name", "updatedAt")
SELECT gen_random_uuid(), "id", 'A', 'Profil A', NOW()
FROM "User"
WHERE "isSharedAccount" = true
ON CONFLICT ("userId", "code") DO NOTHING;

-- Scope attendances per shared profile
ALTER TABLE "Attendance"
ADD COLUMN "sharedProfile" "SharedProfile" NOT NULL DEFAULT 'A';

ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_pkey";

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY ("eventId", "userId", "sharedProfile");

CREATE INDEX "Attendance_eventId_idx"
ON "Attendance"("eventId");
