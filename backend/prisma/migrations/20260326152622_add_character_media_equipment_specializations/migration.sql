/*
  Warnings:

  - A unique constraint covering the columns `[userId,name,realm]` on the table `Character` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "activeSpecIcon" TEXT,
ADD COLUMN     "activeSpecName" TEXT,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "equipment" JSONB,
ADD COLUMN     "insetUrl" TEXT,
ADD COLUMN     "renderUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bnetAccessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_name_realm_key" ON "Character"("userId", "name", "realm");
