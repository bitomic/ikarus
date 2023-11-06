import { boolean, index, int, json, mysqlEnum, mysqlTable, primaryKey, unique, varchar } from 'drizzle-orm/mysql-core'

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
		message: varchar( 'message', { length: 191 } ).notNull()
			.references( () => message.message, { onDelete: 'restrict', onUpdate: 'cascade' } ),
		name: varchar( 'name', { length: 191 } ).notNull(),
		players: json( 'players' ).notNull(),
		tournament: int( 'tournament' ).notNull()
			.references( () => tournamentGame.id, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	},
	table => ( {
		tournamentTeamId: primaryKey( table.id )
	} )
)

export const channelSettings = mysqlTable(
	'ChannelSettings',
	{
		channel: varchar( 'channel', { length: 191 } ).notNull(),
		feature: varchar( 'feature', { length: 191 } ).notNull(),
		guild: varchar( 'guild', { length: 191 } ).notNull()
	},
	table => ( {
		channelSettingsId: primaryKey( table.feature, table.guild )
	} )
)

export const confessions = mysqlTable(
	'Confessions',
	{
		guild: varchar( 'guild', { length: 191 } ).notNull(),
		message: varchar( 'message', { length: 191 } ).notNull(),
		private: boolean( 'private' ).default( true ),
		removed: boolean( 'removed' ).default( false ),
		user: varchar( 'user', { length: 191 } ).notNull()
	},
	table => ( {
		confessionsMessageId: primaryKey( table.message ),
		confessionsUser: index( 'user' ).on( table.user )
	} )
)
