import { type ActiveStream, TwitchTask } from './_TwitchTask'
import type { GuildTextBasedChannel, TextBasedChannel } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import Colors from '@bitomic/material-colors'
import { EmbedBuilder } from '@discordjs/builders'
import { resolveKey } from '@sapphire/plugin-i18next'
import { type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import type { Stream } from '../../../lib'
import type { TwitchFollows } from '@prisma/client'

interface TaskPayload {
	stream: Stream
}

@ApplyOptions<ScheduledTaskOptions>( {
	enabled: true,
	name: 'update-stream'
} )
export class UserTask extends TwitchTask {
	public override async run( { stream }: TaskPayload ): Promise<void> {
		if ( !this.isReady() ) return

		const twitchFollows = this.container.stores.get( 'models' ).get( 'twitchfollows' )
		const targets = await twitchFollows.getStreamerTargets( stream.user_name )

		const user = await this.container.twitch.getUser( stream.user_login )
		const avatar = await this.container.images.getTwitchUserAvatar( user )

		const game = await this.container.twitch.getGame(  stream.game_id )
		const gameImage = await this.container.images.getTwitchGameImage( game )

		for ( const target of targets ) {
			try {
				const activeKey = this.activeStreamKey( target.channel, stream.user_login )
				const isActive = await this.container.redis.exists( activeKey )

				if ( isActive ) {
					await this.updateMessage( target, stream, avatar, gameImage )
				} else {
					await this.createMessage( target, stream, avatar, gameImage )
				}
			} catch ( e ) {
				this.container.logger.warn( `Task[UpdateStream]: There was an error while trying to update ${ target.user } in ${ target.channel }.`, e )
			}
		}
	}

	protected async createEmbed( channel: TextBasedChannel, stream: Stream, avatar: string, game: string ): Promise<EmbedBuilder> {
		const imageUrl = stream.thumbnail_url.replace( '-{width}x{height}', '' )

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
			.setImage( imageUrl )
			.setThumbnail( game )
			.setURL( `https://twitch.tv/${ stream.user_login }` )
			.setTimestamp( new Date( stream.started_at ) )
	}

	protected async createMessage( follow: TwitchFollows, stream: Stream, avatar: string, game: string ): Promise<void> {
		const channelUtility = this.container.utilities.channel
		const channel = await channelUtility.getGuildTextChannel( follow.channel )

		if ( !channel ) {
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
		'update-stream': never;
	}
}
