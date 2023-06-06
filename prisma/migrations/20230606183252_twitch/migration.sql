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
    `mentions` JSON NOT NULL,
    `guild` VARCHAR(191) NOT NULL,
    `user` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`channel`, `user`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Starboard` ADD CONSTRAINT `Starboard_originalId_fkey` FOREIGN KEY (`originalId`) REFERENCES `Message`(`message`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Starboard` ADD CONSTRAINT `Starboard_pinnedId_fkey` FOREIGN KEY (`pinnedId`) REFERENCES `Message`(`message`) ON DELETE RESTRICT ON UPDATE CASCADE;
