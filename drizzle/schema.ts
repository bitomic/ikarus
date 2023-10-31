import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, varchar, mysqlEnum, json, tinyint, int, foreignKey, unique, datetime, text } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"


export const confession = mysqlTable("Confession", {
	guild: varchar("guild", { length: 191 }).notNull(),
	message: varchar("message", { length: 191 }).notNull(),
	user: varchar("user", { length: 191 }).notNull(),
},
(table) => {
	return {
		confessionMessage: primaryKey(table.message),
	}
});

export const configuration = mysqlTable("Configuration", {
	guild: varchar("guild", { length: 191 }).notNull(),
	property: mysqlEnum("property", ['StarboardChannel','StarboardCount']).notNull(),
	value: varchar("value", { length: 191 }).notNull(),
},
(table) => {
	return {
		configurationGuildProperty: primaryKey(table.guild, table.property),
	}
});

export const halloweenGuild = mysqlTable("HalloweenGuild", {
	channels: json("channels").notNull(),
	id: varchar("id", { length: 191 }).notNull(),
	enabled: tinyint("enabled").default(0).notNull(),
	frequency: int("frequency").default(5).notNull(),
	spawnChance: int("spawnChance").default(50).notNull(),
},
(table) => {
	return {
		halloweenGuildId: primaryKey(table.id),
	}
});

export const halloweenInventory = mysqlTable("HalloweenInventory", {
	candyName: varchar("candyName", { length: 191 }).notNull(),
	count: int("count").default(0).notNull(),
	guild: varchar("guild", { length: 191 }).notNull(),
	id: int("id").autoincrement().notNull(),
	userId: int("userId").notNull().references(() => halloweenUser.id, { onDelete: "restrict", onUpdate: "cascade" } ),
},
(table) => {
	return {
		halloweenInventoryId: primaryKey(table.id),
		halloweenInventoryCandyNameGuildUserIdKey: unique("HalloweenInventory_candyName_guild_userId_key").on(table.candyName, table.guild, table.userId),
	}
});

export const halloweenUser = mysqlTable("HalloweenUser", {
	id: int("id").autoincrement().notNull(),
	guild: varchar("guild", { length: 191 }).notNull(),
	user: varchar("user", { length: 191 }).notNull(),
},
(table) => {
	return {
		halloweenUserId: primaryKey(table.id),
		halloweenUserGuildUserKey: unique("HalloweenUser_guild_user_key").on(table.guild, table.user),
	}
});

export const halloweenUserUpgrade = mysqlTable("HalloweenUserUpgrade", {
	guild: varchar("guild", { length: 191 }).notNull(),
	upgradeCount: int("upgradeCount").default(0).notNull(),
	userId: int("userId").notNull().references(() => halloweenUser.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	upgrade: varchar("upgrade", { length: 191 }).notNull(),
},
(table) => {
	return {
		halloweenUserUpgradeGuildUpgradeUserIdKey: unique("HalloweenUserUpgrade_guild_upgrade_userId_key").on(table.guild, table.upgrade, table.userId),
	}
});

export const message = mysqlTable("Message", {
	author: varchar("author", { length: 191 }).notNull(),
	channel: varchar("channel", { length: 191 }).notNull(),
	guild: varchar("guild", { length: 191 }).notNull(),
	message: varchar("message", { length: 191 }).notNull(),
	thread: varchar("thread", { length: 191 }),
},
(table) => {
	return {
		messageMessage: primaryKey(table.message),
	}
});

export const starboard = mysqlTable("Starboard", {
	originalId: varchar("originalId", { length: 191 }).notNull().references(() => message.message, { onDelete: "restrict", onUpdate: "cascade" } ),
	pinnedId: varchar("pinnedId", { length: 191 }).notNull().references(() => message.message, { onDelete: "restrict", onUpdate: "cascade" } ),
},
(table) => {
	return {
		starboardPinnedId: primaryKey(table.pinnedId),
		starboardOriginalIdKey: unique("Starboard_originalId_key").on(table.originalId),
	}
});

export const twitchFollows = mysqlTable("TwitchFollows", {
	channel: varchar("channel", { length: 191 }).notNull(),
	mentions: json("mentions"),
	guild: varchar("guild", { length: 191 }).notNull(),
	user: varchar("user", { length: 191 }).notNull(),
},
(table) => {
	return {
		twitchFollowsChannelUser: primaryKey(table.channel, table.user),
	}
});

export const uniteProfile = mysqlTable("UniteProfile", {
	code: varchar("code", { length: 191 }),
	favoritePokemon: varchar("favoritePokemon", { length: 191 }),
	name: varchar("name", { length: 191 }).notNull(),
	user: varchar("user", { length: 191 }).notNull(),
},
(table) => {
	return {
		uniteProfileUser: primaryKey(table.user),
	}
});

export const prismaMigrations = mysqlTable("_prisma_migrations", {
	id: varchar("id", { length: 36 }).notNull(),
	checksum: varchar("checksum", { length: 64 }).notNull(),
	finishedAt: datetime("finished_at", { mode: 'string', fsp: 3 }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text("logs"),
	rolledBackAt: datetime("rolled_back_at", { mode: 'string', fsp: 3 }),
	startedAt: datetime("started_at", { mode: 'string', fsp: 3 }).default(sql`CURRENT_TIMESTAMP(3)`).notNull(),
	appliedStepsCount: int("applied_steps_count").default(0).notNull(),
},
(table) => {
	return {
		prismaMigrationsId: primaryKey(table.id),
	}
});