/*
  Warnings:

  - Adds `inRoster` on Character with default false.
  - Adds a partial unique index so one user can only have one character in roster.
*/

-- AlterTable
ALTER TABLE "Character"
ADD COLUMN IF NOT EXISTS "inRoster" BOOLEAN NOT NULL DEFAULT false;

-- Safety cleanup: if duplicates already exist, keep one per user (main first, then highest ilvl)
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "isMain" DESC, "ilvl" DESC, "lastSyncAt" DESC, "id" ASC
    ) AS rn
  FROM "Character"
  WHERE "inRoster" = true
)
UPDATE "Character" c
SET "inRoster" = false
FROM ranked r
WHERE c."id" = r."id"
  AND r.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Character_one_roster_per_user_idx"
ON "Character"("userId")
WHERE "inRoster" = true;
