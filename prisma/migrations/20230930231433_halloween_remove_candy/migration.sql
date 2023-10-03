/*
  Warnings:

  - You are about to drop the `HalloweenCandy` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `HalloweenInventory` DROP FOREIGN KEY `HalloweenInventory_candyName_fkey`;

-- DropTable
DROP TABLE `HalloweenCandy`;
