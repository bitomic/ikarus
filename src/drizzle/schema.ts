import { int, json, mysqlEnum, mysqlTable, primaryKey, tinyint, unique, varchar } from 'drizzle-orm/mysql-core'

export const confession = mysqlTable(
	'Confession',
	{
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		message: varchar( 'message', { length: 191 } ).notNull(),
		user: varchar( 'user', { length: 191 } ).notNull(),
	},
	table => ( {
		confessionMessage: primaryKey( table.message ),
	} )
)

export const configuration = mysqlTable(
	'Configuration',
	{
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		property: mysqlEnum( 'property', [ 'StarboardChannel', 'StarboardCount' ] ).notNull(),
		value: varchar( 'value', { length: 191 } ).notNull(),
	},
	table => ( {
		configurationGuildProperty: primaryKey( table.guild, table.property ),
	} )
)

export const halloweenGuild = mysqlTable(
	'HalloweenGuild',
	{
		channels: json( 'channels' ).notNull(),
		enabled: tinyint( 'enabled' ).default( 0 )
			.notNull(),
		frequency: int( 'frequency' ).default( 5 )
			.notNull(),
		id: varchar( 'id', { length: 191 } ).notNull(),
		spawnChance: int( 'spawnChance' ).default( 50 )
			.notNull(),
	},
	table => ( {
		halloweenGuildId: primaryKey( table.id ),
	} )
)

export const halloweenInventory = mysqlTable(
	'HalloweenInventory',
	{
		candyName: varchar( 'candyName', { length: 191 } ).notNull(),
		count: int( 'count' ).default( 0 )
			.notNull(),
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		id: int( 'id' ).autoincrement()
			.notNull(),
		userId: int( 'userId' ).notNull()
			.references( () => halloweenUser.id, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	},
	table => ( {
		halloweenInventoryCandyNameGuildUserIdKey: unique( 'HalloweenInventory_candyName_guild_userId_key' ).on( table.candyName, table.guild, table.userId ),
		halloweenInventoryId: primaryKey( table.id ),
	} ) )

export const halloweenUser = mysqlTable(
	'HalloweenUser',
	{
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		id: int( 'id' ).autoincrement()
			.notNull(),
		user: varchar( 'user', { length: 191 } ).notNull(),
	},
	table => ( {
		halloweenUserGuildUserKey: unique( 'HalloweenUser_guild_user_key' ).on( table.guild, table.user ),
		halloweenUserId: primaryKey( table.id ),
	} ) )

export const halloweenUserUpgrade = mysqlTable(
	'HalloweenUserUpgrade',
	{
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		upgrade: varchar( 'upgrade', { length: 191 } ).notNull(),
		upgradeCount: int( 'upgradeCount' ).default( 0 )
			.notNull(),
		userId: int( 'userId' ).notNull()
			.references( () => halloweenUser.id, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	},
	table => ( {
		halloweenUserUpgradeGuildUpgradeUserIdKey: unique( 'HalloweenUserUpgrade_guild_upgrade_userId_key' ).on( table.guild, table.upgrade, table.userId ),
	} )
)

export const message = mysqlTable(
	'Message',
	{
		author: varchar( 'author', { length: 191 } ).notNull(),
		channel: varchar( 'channel', { length: 191 } ).notNull(),
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		message: varchar( 'message', { length: 191 } ).notNull(),
		thread: varchar( 'thread', { length: 191 } ),
	},
	table => ( {
		messageMessage: primaryKey( table.message ),
	} )
)

export const starboard = mysqlTable(
	'Starboard',
	{
		originalId: varchar( 'originalId', { length: 191 } ).notNull()
			.references( () => message.message, { onDelete: 'restrict', onUpdate: 'cascade' } ),
		pinnedId: varchar( 'pinnedId', { length: 191 } ).notNull()
			.references( () => message.message, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	},
	table => ( {
		starboardOriginalIdKey: unique( 'Starboard_originalId_key' ).on( table.originalId ),
		starboardPinnedId: primaryKey( table.pinnedId ),
	} ) )

export const twitchFollows = mysqlTable(
	'TwitchFollows',
	{
		channel: varchar( 'channel', { length: 191 } ).notNull(),
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		mentions: json( 'mentions' ),
		user: varchar( 'user', { length: 191 } ).notNull(),
	},
	table => ( {
		twitchFollowsChannelUser: primaryKey( table.channel, table.user ),
	} )
)

export const uniteProfile = mysqlTable(
	'UniteProfile',
	{
		code: varchar( 'code', { length: 191 } ),
		favoritePokemon: varchar( 'favoritePokemon', { length: 191 } ),
		name: varchar( 'name', { length: 191 } ).notNull(),
		user: varchar( 'user', { length: 191 } ).notNull(),
	},
	table => ( {
		uniteProfileUser: primaryKey( table.user ),
	} )
)

export const tournamentGame = mysqlTable(
	'TournamentGame',
	{
		game: varchar( 'game', { length: 191 } ).notNull(),
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		id: int( 'id' ).autoincrement()
			.notNull(),
		maxPlayers: int( 'maxPlayers' ).default( 1 )
			.notNull(),
		maxTeams: int( 'maxTeams' ),
		minPlayers: int( 'minPlayers' ).default( 1 )
			.notNull()
	},
	table => ( {
		tournamentGameGuild: unique( 'TournamentGame_guild_game_key' ).on( table.guild, table.game ),
		tournamentGameId: primaryKey( table.id )
	} )
)

export const tournamentTeam = mysqlTable(
	'TournamentTeam',
	{
		id: int( 'id' ).autoincrement()
			.notNull(),
		name: varchar( 'name', { length: 191 } ).notNull(),
		players: json( 'players' ).notNull(),
		tournament: int( 'tournament' ).notNull()
			.references( () => tournamentGame.id, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	},
	table => ( {
		tournamentTeamId: primaryKey( table.id )
	} )
)
