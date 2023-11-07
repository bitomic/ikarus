CREATE TABLE `Confessions` (
	`guild` varchar(191) NOT NULL,
	`message` varchar(191) NOT NULL,
	`private` boolean DEFAULT true,
	`removed` boolean DEFAULT false,
	`user` varchar(191) NOT NULL,
	CONSTRAINT `Confessions_message` PRIMARY KEY(`message`)
);
--> statement-breakpoint
DROP TABLE `Confession`;--> statement-breakpoint
DROP TABLE `HalloweenGuild`;--> statement-breakpoint
DROP TABLE `HalloweenInventory`;--> statement-breakpoint
DROP TABLE `HalloweenUserUpgrade`;--> statement-breakpoint
DROP TABLE `Starboard`;--> statement-breakpoint
ALTER TABLE `ChannelSettings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `ChannelSettings` ADD `feature` varchar(191) NOT NULL;--> statement-breakpoint
CREATE INDEX `user` ON `Confessions` (`user`);--> statement-breakpoint
ALTER TABLE `ChannelSettings` ADD PRIMARY KEY(`feature`,`guild`);