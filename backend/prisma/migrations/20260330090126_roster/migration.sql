/*
  Warnings:

  - A unique constraint covering the columns `[blizzardId]` on the table `Character` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "blizzardId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Character_blizzardId_key" ON "Character"("blizzardId");
