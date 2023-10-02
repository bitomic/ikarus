/*
  Warnings:

  - You are about to drop the column `upgradeName` on the `HalloweenUserUpgrade` table. All the data in the column will be lost.
  - You are about to drop the `HalloweenUpgrade` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[guild,upgrade,userId]` on the table `HalloweenUserUpgrade` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `upgrade` to the `HalloweenUserUpgrade` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `HalloweenUserUpgrade` DROP FOREIGN KEY `HalloweenUserUpgrade_upgradeName_fkey`;

-- DropIndex
DROP INDEX `HalloweenUserUpgrade_guild_upgradeName_userId_key` ON `HalloweenUserUpgrade`;

-- AlterTable
ALTER TABLE `HalloweenUserUpgrade` DROP COLUMN `upgradeName`,
    ADD COLUMN `upgrade` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `HalloweenUpgrade`;

-- CreateIndex
CREATE UNIQUE INDEX `HalloweenUserUpgrade_guild_upgrade_userId_key` ON `HalloweenUserUpgrade`(`guild`, `upgrade`, `userId`);
