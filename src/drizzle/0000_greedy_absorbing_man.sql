-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `Confession` (
	`guild` varchar(191) NOT NULL,
	`message` varchar(191) NOT NULL,
	`user` varchar(191) NOT NULL,
	CONSTRAINT `Confession_message` PRIMARY KEY(`message`)
);
--> statement-breakpoint
CREATE TABLE `Configuration` (
	`guild` varchar(191) NOT NULL,
	`property` enum('StarboardChannel','StarboardCount') NOT NULL,
	`value` varchar(191) NOT NULL,
	CONSTRAINT `Configuration_guild_property` PRIMARY KEY(`guild`,`property`)
);
--> statement-breakpoint
CREATE TABLE `HalloweenGuild` (
	`channels` json NOT NULL,
	`id` varchar(191) NOT NULL,
	`enabled` tinyint NOT NULL DEFAULT 0,
	`frequency` int NOT NULL DEFAULT 5,
	`spawnChance` int NOT NULL DEFAULT 50,
	CONSTRAINT `HalloweenGuild_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `HalloweenInventory` (
	`candyName` varchar(191) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`guild` varchar(191) NOT NULL,
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	CONSTRAINT `HalloweenInventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `HalloweenInventory_candyName_guild_userId_key` UNIQUE(`candyName`,`guild`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `HalloweenUser` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guild` varchar(191) NOT NULL,
	`user` varchar(191) NOT NULL,
	CONSTRAINT `HalloweenUser_id` PRIMARY KEY(`id`),
	CONSTRAINT `HalloweenUser_guild_user_key` UNIQUE(`guild`,`user`)
);
--> statement-breakpoint
CREATE TABLE `HalloweenUserUpgrade` (
	`guild` varchar(191) NOT NULL,
	`upgradeCount` int NOT NULL DEFAULT 0,
	`userId` int NOT NULL,
	`upgrade` varchar(191) NOT NULL,
	CONSTRAINT `HalloweenUserUpgrade_guild_upgrade_userId_key` UNIQUE(`guild`,`upgrade`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`author` varchar(191) NOT NULL,
	`channel` varchar(191) NOT NULL,
	`guild` varchar(191) NOT NULL,
	`message` varchar(191) NOT NULL,
	`thread` varchar(191),
	CONSTRAINT `Message_message` PRIMARY KEY(`message`)
);
--> statement-breakpoint
CREATE TABLE `Starboard` (
	`originalId` varchar(191) NOT NULL,
	`pinnedId` varchar(191) NOT NULL,
	CONSTRAINT `Starboard_pinnedId` PRIMARY KEY(`pinnedId`),
	CONSTRAINT `Starboard_originalId_key` UNIQUE(`originalId`)
);
--> statement-breakpoint
CREATE TABLE `TwitchFollows` (
	`channel` varchar(191) NOT NULL,
	`mentions` json,
	`guild` varchar(191) NOT NULL,
	`user` varchar(191) NOT NULL,
	CONSTRAINT `TwitchFollows_channel_user` PRIMARY KEY(`channel`,`user`)
);
--> statement-breakpoint
CREATE TABLE `UniteProfile` (
	`code` varchar(191),
	`favoritePokemon` varchar(191),
	`name` varchar(191) NOT NULL,
	`user` varchar(191) NOT NULL,
	CONSTRAINT `UniteProfile_user` PRIMARY KEY(`user`)
);
--> statement-breakpoint
CREATE TABLE `_prisma_migrations` (
	`id` varchar(36) NOT NULL,
	`checksum` varchar(64) NOT NULL,
	`finished_at` datetime(3),
	`migration_name` varchar(255) NOT NULL,
	`logs` text,
	`rolled_back_at` datetime(3),
	`started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`applied_steps_count` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `_prisma_migrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `HalloweenInventory` ADD CONSTRAINT `HalloweenInventory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `HalloweenUser`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `HalloweenUserUpgrade` ADD CONSTRAINT `HalloweenUserUpgrade_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `HalloweenUser`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Starboard` ADD CONSTRAINT `Starboard_originalId_fkey` FOREIGN KEY (`originalId`) REFERENCES `Message`(`message`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Starboard` ADD CONSTRAINT `Starboard_pinnedId_fkey` FOREIGN KEY (`pinnedId`) REFERENCES `Message`(`message`) ON DELETE restrict ON UPDATE cascade;
*/