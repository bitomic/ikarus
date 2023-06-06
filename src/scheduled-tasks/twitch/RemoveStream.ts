import { EmbedBuilder, hyperlink } from '@discordjs/builders'
import type { EmbedField, GuildTextBasedChannel, TextBasedChannel } from 'discord.js'
import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { ApplyOptions } from '@sapphire/decorators'
import Colors from '@bitomic/material-colors'
import { resolveKey } from '@sapphire/plugin-i18next'
import { s } from '@sapphire/shapeshift'
import { SnowflakeRegex } from '@sapphire/discord-utilities'
import type { Stream } from '../../lib'
import { Time } from '@sapphire/duration'
import type { TwitchFollows } from '@prisma/client'

interface ActiveStream {
	channel: string
	message: string
	streamer: string
	vod: string
}

interface TaskPayload {
	user: string
}

@ApplyOptions<ScheduledTaskOptions>( {
	interval: Time.Minute * 5,
	name: 'remove-stream'
} )
export class UserTask extends ScheduledTask {
	public readonly activeStreamValidator = s.object( {
		channel: s.string.regex( SnowflakeRegex ),
		message: s.string.regex( SnowflakeRegex ),
		streamer: s.string,
		vod: s.string
	} ).ignore

	public override async run( { user }: TaskPayload ): Promise<void> {
		if ( !this.container.client.isReady() ) {
			this.container.logger.warn( 'Task[RemoveStream]: Client isn\'t ready yet.' )
			return
		}

		const { redis } = this.container
		const keys = await redis.keys( this.activeStreamKey( '*', user ) )
		if ( keys.length === 0 ) return

		for ( const key of keys ) {
			try {
				const activeStream = this.activeStreamValidator.parse( await redis.hgetall( key ) )
				await redis.del( key )

				const channel = await this.container.client.channels.fetch( activeStream.channel ) as GuildTextBasedChannel
				const message = await channel.messages.fetch( activeStream.message )
				const embedData = message.embeds.at( 0 )?.data
				if ( !embedData ) continue

				const embed = new EmbedBuilder( embedData )
				const embedFields: EmbedField[] = []

				const game = embedData.fields?.at( 0 )?.value
				if ( game ) {
					embedFields.push( {
						inline: true,
						name: await resolveKey( channel, 'twitch:game' ),
						value: game
					} )
				}

				const vod = hyperlink( 'Link', `https://twitch.tv/videos/${ activeStream.vod }` )
				embedFields.push( {
					inline: true,
					name: 'VOD',
					value: vod
				} )
				embed.setFields( ...embedFields )

				embed.setAuthor( {
					iconURL: embed.data.author?.icon_url ?? '',
					name: await resolveKey( channel, 'twitch:was-live', { replace: { user } } )
				} )

				await message.edit( { embeds: [ embed ] } )
			} catch ( e ) {
				this.container.logger.warn( `Task[RemoveStream]: There was an error while removing ${ key }.`, e )
			}
		}
	}

	protected activeStreamKey( channel: string, streamer: string ): string {
		return `twitch:active-stream/${ streamer }/${ channel }`
	}

	protected async createEmbed( channel: TextBasedChannel, stream: Stream, avatar: string, game: string ): Promise<EmbedBuilder> {
		return new EmbedBuilder()
			.setColor( Colors.deepPurple.a400 )
			.setAuthor( {
				iconURL: avatar,
				name: await resolveKey( channel, 'twitch:is-live', { replace: { user: stream.user_name } } )
			} )
			.setTitle( stream.title )
			.addFields(
				{
					inline: true,
					name: await resolveKey( channel, 'twitch:game' ),
					value: stream.game_name
				},
				{
					inline: true,
					name: await resolveKey( channel, 'twitch:viewers' ),
					value: `${ stream.viewer_count }`
				}
			)
			.setImage( stream.thumbnail_url.replace( '-{width}x{height}', '' ) )
			.setThumbnail( game )
			.setURL( `https://twitch.tv/${ stream.user_login }` )
			.setTimestamp( new Date( stream.started_at ) )
	}

	protected async createMessage( follow: TwitchFollows, stream: Stream, avatar: string, game: string ): Promise<void> {
		const channel = await this.container.client.channels.fetch( follow.channel )
		const bot = this.container.client.user

		if ( !bot || !channel?.isTextBased() || channel.isDMBased() || !channel.permissionsFor( bot )?.has( 'SendMessages' ) ) {
			this.container.logger.warn( `Can't send stream updates in channel ${ follow.channel }.` )
			return
		}

		const embed = await this.createEmbed( channel, stream, avatar, game )
		const message = await channel.send( {
			embeds: [ embed ]
		} )

		const activeStream: ActiveStream = {
			channel: channel.id,
			message: message.id,
			streamer: stream.user_login,
			vod: stream.id
		}
		const activeKey = this.activeStreamKey( channel.id, stream.user_login )
		await this.container.redis.hset( activeKey, activeStream )
	}

	protected async updateMessage( follow: TwitchFollows, stream: Stream, avatar: string, game: string ): Promise<void> {
		const activeKey = this.activeStreamKey( follow.channel, stream.user_login )
		const validated = this.activeStreamValidator.run( await this.container.redis.hgetall( activeKey ) )
		if ( validated.isErr() ) {
			await this.createMessage( follow, stream, avatar, game )
			return
		}

		const activeStream = validated.unwrap()
		const channel = await this.container.client.channels.fetch( activeStream.channel ) as GuildTextBasedChannel
		const message = await channel.messages.fetch( activeStream.message )

		const embed = await this.createEmbed( channel, stream, avatar, game )
		await message.edit( { embeds: [ embed ] } )
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		'remove-stream': never;
	}
}
