CREATE TABLE `TournamentGame` (
	`game` varchar(191) NOT NULL,
	`guild` varchar(191) NOT NULL,
	`id` int AUTO_INCREMENT NOT NULL,
	`maxPlayers` int NOT NULL DEFAULT 1,
	`maxTeams` int,
	`minPlayers` int NOT NULL DEFAULT 1,
	CONSTRAINT `TournamentGame_id` PRIMARY KEY(`id`),
	CONSTRAINT `TournamentGame_guild_game_key` UNIQUE(`guild`,`game`)
);
--> statement-breakpoint
CREATE TABLE `TournamentTeam` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`players` json NOT NULL,
	`tournament` int NOT NULL,
	CONSTRAINT `TournamentTeam_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `_prisma_migrations`;--> statement-breakpoint
ALTER TABLE `HalloweenInventory` DROP FOREIGN KEY `HalloweenInventory_userId_fkey`;
--> statement-breakpoint
ALTER TABLE `HalloweenUserUpgrade` DROP FOREIGN KEY `HalloweenUserUpgrade_userId_fkey`;
--> statement-breakpoint
ALTER TABLE `Starboard` DROP FOREIGN KEY `Starboard_originalId_fkey`;
--> statement-breakpoint
ALTER TABLE `Starboard` DROP FOREIGN KEY `Starboard_pinnedId_fkey`;
--> statement-breakpoint
ALTER TABLE `HalloweenInventory` ADD CONSTRAINT `HalloweenInventory_userId_HalloweenUser_id_fk` FOREIGN KEY (`userId`) REFERENCES `HalloweenUser`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `HalloweenUserUpgrade` ADD CONSTRAINT `HalloweenUserUpgrade_userId_HalloweenUser_id_fk` FOREIGN KEY (`userId`) REFERENCES `HalloweenUser`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Starboard` ADD CONSTRAINT `Starboard_originalId_Message_message_fk` FOREIGN KEY (`originalId`) REFERENCES `Message`(`message`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Starboard` ADD CONSTRAINT `Starboard_pinnedId_Message_message_fk` FOREIGN KEY (`pinnedId`) REFERENCES `Message`(`message`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `TournamentTeam` ADD CONSTRAINT `TournamentTeam_message_Message_message_fk` FOREIGN KEY (`message`) REFERENCES `Message`(`message`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `TournamentTeam` ADD CONSTRAINT `TournamentTeam_tournament_TournamentGame_id_fk` FOREIGN KEY (`tournament`) REFERENCES `TournamentGame`(`id`) ON DELETE restrict ON UPDATE cascade;