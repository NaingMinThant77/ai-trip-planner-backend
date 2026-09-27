/*
  Warnings:

  - You are about to drop the column `budgetTier` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `interests` on the `Trip` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "budgetTier",
DROP COLUMN "interests",
ADD COLUMN     "coverImagePublicId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT '';
