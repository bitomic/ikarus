/*
import type { EmbedField, Guild } from 'discord.js'
import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import type { ActiveStream } from '../../utils'
import { ApplyOptions } from '@sapphire/decorators'
import { ChannelType } from 'discord.js'
import Colors from '@bitomic/material-colors'
import { EmbedBuilder } from '@discordjs/builders'
import { resolveKey } from '@sapphire/plugin-i18next'
import { type Stream } from '../../lib'
import { Time } from '@sapphire/duration'

@ApplyOptions<ScheduledTaskOptions>( {
	interval: Time.Minute * 5,
	name: 'streams'
} )
export class UserTask extends ScheduledTask {
	public override async run(): Promise<void> {
		if ( !this.container.client.isReady() ) {
			this.container.logger.warn( 'Task[Streams]: Client isn\'t ready yet.' )
			return
		}

		const twitchFollows = this.container.stores.get( 'models' ).get( 'TwitchFollows' )
		const streamers = await twitchFollows.getStreamers()
		const offlineStreamers = new Set<string>()

		while ( streamers.length ) {
			const chunk = streamers.splice( 0, 100 )
			const streams = await this.container.twitch.getStreams( chunk )
			chunk.forEach( name => {
				const isOnline = streams.find( s => s.user_login === name )
				if ( !isOnline ) offlineStreamers.add( name )
			} )

			for ( const stream of streams ) {
				await this.processStream( stream )
			}
		}

		for ( const name of offlineStreamers ) {
			await this.processOfflineStreamer( name )
		}
	}

	protected activeStreamKey( guild: string, streamer: string ): string {
		return `twitch:active-stream/${ streamer }/${ guild }`
	}

	protected async processStream( stream: Stream ): Promise<void> {
		const twitchFollows = this.container.stores.get( 'models' ).get( 'TwitchFollows' )
		const targets = await twitchFollows.getStreamerTargets( stream.user_name )

		const twitchUser = await this.container.twitch.getUser( stream.user_login )
		const twitchUserAvatar = await this.container.images.getTwitchUserAvatar( twitchUser )

		const twitchGame = await this.container.twitch.getGame( stream.game_id )
		const twitchGameImage = await this.container.images.getTwitchGameImage( twitchGame )

		for ( const target of targets ) {
			await this.processTarget( stream, target, twitchUserAvatar, twitchGameImage )
		}
	}

	protected async processTarget( stream: Stream, target: Record<'channel' | 'guild', string>, userAvatar: string, gameImage: string ): Promise<void> {
		try {
			const activeKey = this.activeStreamKey( target.guild, stream.user_login )
			const isActive = await this.container.redis.exists( activeKey )

			const guild = await this.container.client.guilds.fetch( target.guild )
			const channel = await guild.channels.fetch( target.channel )
			if ( channel?.type !== ChannelType.GuildText ) return

			const embed = await this.createEmbed( { gameImage, guild, stream, userAvatar } )

			if ( isActive ) {
				const activeStream = await this.container.redis.hgetall( activeKey ) as unknown as ActiveStream
				const message = await channel.messages.fetch( activeStream.message )
				const success = await message.edit( { embeds: [ embed ] } )
					.catch( () => null )
				if ( success ) return
			}

			const message = await channel.send( { embeds: [ embed ] } )
			const activeStream: ActiveStream = {
				channel: channel.id,
				guild: guild.id,
				message: message.id,
				streamer: stream.user_login,
				vod: stream.id
			}
			await this.container.redis.hset( activeKey, activeStream )
		} catch ( e ) {
			this.container.logger.error( `An error occurred while trying to update ${ stream.user_name }'s streaming in guild ${ target.guild } and channel ${ target.channel }.` )
			this.container.logger.error( e )
		}
	}

	protected async createEmbed( options: { gameImage: string, guild: Guild, stream: Stream, userAvatar: string } ): Promise<EmbedBuilder> {
		const { gameImage, guild, stream, userAvatar } = options

		const image = stream.thumbnail_url.replace( '-{width}x{height}', '' )
		const embed = new EmbedBuilder()
			.setColor( Colors.deepPurple.a400 )
			.setAuthor( {
				iconURL: userAvatar,
				name: await resolveKey( guild, 'twitch:is-live', { replace: { user: stream.user_name } } )
			} )
			.setTitle( stream.title )
			.addFields(
				{
					inline: true,
					name: await resolveKey( guild, 'twitch:game' ),
					value: stream.game_name
				},
				{
					inline: true,
					name: await resolveKey( guild, 'twitch:viewers' ),
					value: `${ stream.viewer_count }`
				}
			)
			.setImage( `${ image }?cb=${ Date.now() }` )
			.setThumbnail( gameImage )
			.setURL( `https://twitch.tv/${ stream.user_login }` )
			.setTimestamp( new Date( stream.started_at ) )

		return embed
	}

	protected async processOfflineStreamer( name: string ): Promise<void> {
		try {
			const { redis } = this.container
			const redisKeys = await redis.keys( this.activeStreamKey( '*', name ) )
			if ( redisKeys.length === 0 ) return

			for ( const key of redisKeys ) {
				const activeStream = await redis.hgetall( key ) as unknown as ActiveStream
				await redis.del( key )

				const guild = await this.container.client.guilds.fetch( activeStream.guild )
				const channel = await guild.channels.fetch( activeStream.channel )
				if ( channel?.type !== ChannelType.GuildText ) continue

				const message = await channel.messages.fetch( activeStream.message )
				await message.fetch()
				const embed = message.embeds.at( 0 )?.data ?? {}
				const author = embed.author ?? {}
				const game = embed.fields?.at( 0 )?.value ?? ''
				const fields: EmbedField[] = []
				if ( game ) {
					fields.push( {
						inline: true,
						name: await resolveKey( guild, 'twitch:game' ),
						value: game
					} )
				}
				fields.push( {
					inline: true,
					name: 'VOD',
					value: `https://twitch.tv/videos/${ activeStream.vod }`
				} )

				await message.edit( {
					embeds: [ {
						...embed,
						author: {
							...author,
							name: await resolveKey( guild, 'twitch:was-live', { replace: { user: name } } )
						},
						fields
					} ]
				} )
			}
		} catch ( e ) {
			this.container.logger.error( `An error occurred while trying to update ${ name }'s offline streaming.` )
			this.container.logger.error( e )
		}
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		streams: never;
	}
}
*/
