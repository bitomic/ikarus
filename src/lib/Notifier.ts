/* eslint-disable max-classes-per-file */
import { EmbedBuilder } from '@discordjs/builders'
import { container } from '@sapphire/pieces'
import { ChannelType, type Webhook } from 'discord.js'
import { Colors } from '@bitomic/material-colors'

export type SentinelLevel = 'error' | 'info' | 'log' | 'warn'

export interface SentinelPayload {
	channel?: string
	guild: string
	user?: string
}

export class Sentinel {
	public static readonly channelIds = {
		error: '1169752282234093610',
		info: '1169752250193805373',
		log: '1169752684224581662',
		warn: '1169752268879429642'
	}
	public static readonly colors = {
		error: Colors.red.s800,
		info: Colors.teal.s800,
		log: Colors.indigo.s800,
		warn: Colors.amber.s800
	}
	public static readonly webhooks = new Map<string, Webhook>()
	public readonly name: string

	public constructor( name: string ) {
		this.name = name
	}

	public async error( message: string | EmbedBuilder, options?: SentinelPayload ): Promise<void> {
		await this.send( 'error', message, options )
	}

	public async info( message: string | EmbedBuilder, options?: SentinelPayload ): Promise<void> {
		await this.send( 'info', message, options )
	}

	public async log( message: string | EmbedBuilder, options?: SentinelPayload ): Promise<void> {
		await this.send( 'log', message, options )
	}

	public async warn( message: string | EmbedBuilder, options?: SentinelPayload ): Promise<void> {
		await this.send( 'warn', message, options )
	}

	protected async getWebhook( level: SentinelLevel ): Promise<Webhook> {
		const stored = Sentinel.webhooks.get( level )
		if ( stored ) return stored

		const channel = await container.utilities.channel.getChannel( Sentinel.channelIds[ level ], ChannelType.GuildText )
		const webhooks = await channel.fetchWebhooks()
		const webhook = webhooks.find( i => i.owner?.id === container.client.user?.id ) ?? await channel.createWebhook( {
			avatar: container.client.user?.avatarURL( { extension: 'png' } ) ?? '',
			name: container.client.user?.displayName ?? 'Logging'
		} )
		Sentinel.webhooks.set( level, webhook )
		return webhook
	}

	protected async send( level: SentinelLevel, message: string | EmbedBuilder, options?: SentinelPayload ): Promise<void> {
		const webhook = await this.getWebhook( level )
		const embed = typeof message === 'string' ? new EmbedBuilder( { description: message } ) : message
		embed.setColor( Sentinel.colors[ level ] )

		if ( options ) {
			try {
				const guild = await container.client.guilds.fetch( options.guild )
				const channel = options.channel ? await container.client.channels.fetch( options.channel ) : null
				const user = options.user ? await container.client.users.fetch( options.user ) : null
				embed.setTitle( `${ guild.name } · ${ guild.id }` )

				if ( user ) {
					embed.setAuthor( {
						iconURL: user.avatarURL( { extension: 'png' } ) ?? '',
						name: `${ user.username } · ${ user.id }`
					} )
				}

				if ( channel && 'guild' in channel ) {
					embed.setFooter( {
						iconURL: guild.iconURL( { extension: 'png' } ) ?? '',
						text: `${ this.name } · #${ channel.name } · ${ channel.id }`
					} )
				}
			} catch ( e ) {
				container.logger.error( e )
			}
		}

		await webhook.send( {
			embeds: [ embed ]
		} )
	}
}

export class Notifier {
	protected readonly channels = new Map<string, Sentinel>()

	public for( name: string ): Sentinel {
		const stored = this.channels.get( name )
		if ( stored ) return stored

		const sentinel = new Sentinel( name )
		this.channels.set( name, sentinel )
		return sentinel
	}
}
