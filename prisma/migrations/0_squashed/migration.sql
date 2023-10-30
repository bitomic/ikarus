-- CreateTable
CREATE TABLE `Message` (
    `author` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `guild` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `thread` VARCHAR(191) NULL,

    PRIMARY KEY (`message`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Starboard` (
    `originalId` VARCHAR(191) NOT NULL,
    `pinnedId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Starboard_originalId_key`(`originalId`),
    PRIMARY KEY (`pinnedId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Configuration` (
    `guild` VARCHAR(191) NOT NULL,
    `property` ENUM('StarboardChannel', 'StarboardCount') NOT NULL,
    `value` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`guild`, `property`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TwitchFollows` (
    `channel` VARCHAR(191) NOT NULL,
    `mentions` JSON NULL,
    `guild` VARCHAR(191) NOT NULL,
    `user` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`channel`, `user`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HalloweenGuild` (
    `channels` JSON NOT NULL,
    `id` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `frequency` INTEGER NOT NULL DEFAULT 5,
    `spawnChance` INTEGER NOT NULL DEFAULT 50,

    PRIMARY KEY (`id`)
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
CREATE TABLE `HalloweenUserUpgrade` (
    `guild` VARCHAR(191) NOT NULL,
    `upgrade` VARCHAR(191) NOT NULL,
    `upgradeCount` INTEGER NOT NULL DEFAULT 0,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `HalloweenUserUpgrade_guild_upgrade_userId_key`(`guild`, `upgrade`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Starboard` ADD CONSTRAINT `Starboard_originalId_fkey` FOREIGN KEY (`originalId`) REFERENCES `Message`(`message`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Starboard` ADD CONSTRAINT `Starboard_pinnedId_fkey` FOREIGN KEY (`pinnedId`) REFERENCES `Message`(`message`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HalloweenInventory` ADD CONSTRAINT `HalloweenInventory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `HalloweenUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HalloweenUserUpgrade` ADD CONSTRAINT `HalloweenUserUpgrade_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `HalloweenUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

