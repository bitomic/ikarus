-- CreateTable
CREATE TABLE `Confession` (
    `guild` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `user` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`message`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
