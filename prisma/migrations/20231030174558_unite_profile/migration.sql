-- CreateTable
CREATE TABLE `UniteProfile` (
    `code` VARCHAR(191) NOT NULL,
    `favoritePokemon` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `user` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`user`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
