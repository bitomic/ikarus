import { load } from 'ts-dotenv'

export const env = load( {
	DATABASE_URL: String,
	DISCORD_DEVELOPMENT_SERVER: String,
	DISCORD_OWNER: String,
	DISCORD_PREFIX: {
		optional: true,
		type: String
	},
	DISCORD_TOKEN: String,
	IMGUR_CLIENT_ID: String,
	IMGUR_CLIENT_SECRET: String,
	NODE_ENV: [
		'development' as const,
		'production' as const
	],
	REDIS_DB: Number,
	REDIS_HOST: String,
	REDIS_PASSWORD: {
		default: '',
		type: String
	},
	REDIS_PORT: Number,
	REDIS_USERNAME: {
		default: '',
		type: String
	},
	TWITCH_CLIENT: String,
	TWITCH_SECRET: String
} )
