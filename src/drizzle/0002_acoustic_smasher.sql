CREATE TABLE `ChannelSettings` (
	`channel` varchar(191) NOT NULL,
	`guild` varchar(191) NOT NULL,
	CONSTRAINT `ChannelSettings_channel_guild` PRIMARY KEY(`channel`,`guild`)
);
