import { container, LogLevel, SapphireClient } from '@sapphire/framework'
import { Events, Locale, Partials } from 'discord.js'
import { env } from './environment'
import { ModelStore } from '../framework'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import Redis from 'ioredis'
import { ScheduledTaskRedisStrategy } from '@sapphire/plugin-scheduled-tasks/register-redis'

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
				'GuildMessageReactions'
			],
			loadDefaultErrorListeners: true,
			logger: {
				level: LogLevel.Info
			},
			partials: [ Partials.Channel, Partials.Message, Partials.Reaction ],
			tasks: {
				strategy: new ScheduledTaskRedisStrategy( {
					bull: {
						connection: redisOptions,
						defaultJobOptions: {
							removeOnComplete: true,
							removeOnFail: true
						}
					}
				} )
			}
		} )
		container.prisma = new PrismaClient()
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
	}

	public async start(): Promise<void> {
		await this.login( env.DISCORD_TOKEN )
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		prisma: PrismaClient
		ready: () => Promise<true>
		redis: Redis
	}
}
