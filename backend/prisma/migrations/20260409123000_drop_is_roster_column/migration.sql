/*
  Migrate legacy roster flag to inRoster and remove obsolete isRoster column.
*/

-- Backfill inRoster from historical isRoster when user has no inRoster yet.
UPDATE "Character" c
SET "inRoster" = true
WHERE c."isRoster" = true
  AND c."inRoster" = false
  AND NOT EXISTS (
    SELECT 1
    FROM "Character" existing
    WHERE existing."userId" = c."userId"
      AND existing."inRoster" = true
  );

-- Drop legacy flag, keep a single source of truth.
ALTER TABLE "Character"
DROP COLUMN IF EXISTS "isRoster";
