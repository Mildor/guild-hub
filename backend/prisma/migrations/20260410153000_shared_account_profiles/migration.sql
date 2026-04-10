-- CreateEnum
CREATE TYPE "SharedProfile" AS ENUM ('A', 'B', 'C');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "isSharedAccount" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Character"
ADD COLUMN "sharedProfile" "SharedProfile";
