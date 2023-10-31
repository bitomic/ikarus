import { container, LogLevel, SapphireClient } from '@sapphire/framework'
import { Events, Locale, Partials } from 'discord.js'
import { env } from './environment.js'
import fs from 'fs'
import { getRootData } from '@sapphire/pieces'
import { ModelStore } from '#framework/ModelStore'
import path from 'path'
import { randomUUID } from 'crypto'
import { Redis } from 'ioredis'
import { Twitch } from './Twitch.js'
import { ImageManager } from './images.js'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type * as schema from '../drizzle/schema.js'

export class UserClient extends SapphireClient {
	public constructor() {
		const redisOptions = {
			db: env.REDIS_DB,
			host: env.REDIS_HOST,
			password: env.REDIS_PASSWORD,
			port: env.REDIS_PORT,
			username: env.REDIS_USERNAME
		}
		super( {
			api: {
				acceptedContentMimeTypes: [ 'application/json' ],
				listenOptions: {
					port: 4000
				},
				origin: '*',
				prefix: 'v1/',
			},
			defaultPrefix: env.DISCORD_PREFIX ?? '!',
			i18n: {
				fetchLanguage: context => {
					const { languages } = container.i18n
					const lang = context.guild?.preferredLocale ?? ''
					return languages.has( lang ) ? lang : Locale.EnglishUS
				}
			},
			intents: [
				'Guilds',
				'GuildMessages',
				'GuildMessageReactions',
				'MessageContent'
			],
			loadDefaultErrorListeners: true,
			logger: {
				level: LogLevel.Info
			},
			partials: [ Partials.Channel, Partials.Message, Partials.Reaction ],
			tasks: {
				bull: {
					connection: redisOptions,
					defaultJobOptions: {
						removeOnComplete: true,
						removeOnFail: false
					}
				},
				queue: 'ajax-tasks'
			}
		} )
		container.images = new ImageManager()
		container.ready = async (): Promise<true> => {
			if ( this.isReady() ) return true

			const identifier = randomUUID()
			container.logger.info( `A function is waiting for a ready event (${ identifier })` )
			const logDone = () => container.logger.info( `The ready event was sent to ${ identifier }` )

			await Promise.race( [
				setTimeout( logDone, 1000 * 10 ),
				new Promise<void>( resolve => {
					this.on( Events.ClientReady, () => {
						logDone()
						resolve()
					} )
				} )
			] )

			return true
		}
		container.redis = new Redis( redisOptions )
		container.stores.register( new ModelStore() )
		container.twitch = new Twitch()

		const { root } = getRootData()
		const modules = fs.readdirSync( path.join( root, 'modules' ) )
		for ( const module of modules ) {
			const modulepath = path.join( root, 'modules', module )
			this.stores.registerPath( modulepath )
		}
	}

	public async start(): Promise<void> {
		await this.login( env.DISCORD_TOKEN )
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		drizzle: MySql2Database<typeof schema>
		images: ImageManager
		ready: () => Promise<true>
		redis: Redis
		twitch: Twitch
	}
}
