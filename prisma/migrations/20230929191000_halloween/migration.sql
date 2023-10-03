-- CreateTable
CREATE TABLE `HalloweenGuild` (
    `channels` JSON NOT NULL,
    `id` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HalloweenCandy` (
    `name` VARCHAR(191) NOT NULL,
    `rarity` ENUM('Common', 'Uncommon', 'Rare') NOT NULL,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HalloweenUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guild` VARCHAR(191) NOT NULL,
    `user` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `HalloweenUser_guild_user_key`(`guild`, `user`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HalloweenInventory` (
    `candyName` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `guild` VARCHAR(191) NOT NULL,
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `HalloweenInventory_candyName_guild_userId_key`(`candyName`, `guild`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HalloweenUpgrade` (
    `max` INTEGER NOT NULL DEFAULT 1,
    `name` VARCHAR(191) NOT NULL,
    `recipe` JSON NOT NULL,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HalloweenUserUpgrade` (
    `guild` VARCHAR(191) NOT NULL,
    `upgradeCount` INTEGER NOT NULL DEFAULT 0,
    `upgradeName` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `HalloweenUserUpgrade_guild_upgradeName_userId_key`(`guild`, `upgradeName`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HalloweenInventory` ADD CONSTRAINT `HalloweenInventory_candyName_fkey` FOREIGN KEY (`candyName`) REFERENCES `HalloweenCandy`(`name`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HalloweenInventory` ADD CONSTRAINT `HalloweenInventory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `HalloweenUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HalloweenUserUpgrade` ADD CONSTRAINT `HalloweenUserUpgrade_upgradeName_fkey` FOREIGN KEY (`upgradeName`) REFERENCES `HalloweenUpgrade`(`name`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HalloweenUserUpgrade` ADD CONSTRAINT `HalloweenUserUpgrade_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `HalloweenUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
