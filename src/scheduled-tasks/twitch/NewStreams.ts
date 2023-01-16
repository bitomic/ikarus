import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import type { ActiveStream } from '../../utils'
import { ApplyOptions } from '@sapphire/decorators'
import { ChannelType } from 'discord.js'
import Colors from '@bitomic/material-colors'
import { EmbedBuilder } from '@discordjs/builders'
import { resolveKey } from '@sapphire/plugin-i18next'
import { Time } from '@sapphire/duration'

@ApplyOptions<ScheduledTaskOptions>( {
	interval: Time.Minute * 5,
	name: 'new-streams'
} )
export class UserTask extends ScheduledTask {
	public override async run(): Promise<void> {
		await this.container.ready()

		const twitchFollows = this.container.stores.get( 'models' ).get( 'TwitchFollows' )
		const streamers = await twitchFollows.getStreamers()

		while ( streamers.length ) {
			const chunk = streamers.splice( 0, 100 )
			const streams = await this.container.twitch.getStreams( chunk )
			for ( const stream of streams ) {
				const targets = await twitchFollows.getStreamerTargets( stream.user_name )

				const twitchUser = await this.container.twitch.getUser( stream.user_login )
				const twitchUserAvatar = await this.container.images.getTwitchUserAvatar( twitchUser )

				const twitchGame = await this.container.twitch.getGame( stream.game_id )
				const twitchGameImage = await this.container.images.getTwitchGameImage( twitchGame )

				for ( const target of targets ) {
					try {
						const activeKey = this.activeStreamKey( target.guild, stream.user_login )
						const isActive = await this.container.redis.exists( activeKey )
						if ( isActive ) continue

						const guild = await this.container.client.guilds.fetch( target.guild )
						const channel = await guild.channels.fetch( target.channel )
						if ( channel?.type !== ChannelType.GuildText ) continue

						const embed = new EmbedBuilder()
							.setColor( Colors.deepPurple.a400 )
							.setAuthor( {
								iconURL: twitchUserAvatar,
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
							.setImage( stream.thumbnail_url.replace( '-{width}x{height}', '' ) )
							.setThumbnail( twitchGameImage )
							.setURL( `https://twitch.tv/${ stream.user_login }` )
							.setTimestamp( new Date( stream.started_at ) )

						const message = await channel.send( { embeds: [ embed ] } )
						const activeStream: ActiveStream = {
							channel: channel.id,
							guild: guild.id,
							message: message.id,
							streamer: stream.user_login,
							vod: stream.id
						}
						await this.container.redis.hset( activeKey, activeStream )
						await this.container.tasks.create( 'update-stream', { key: activeKey }, Time.Minute * 10 )
					} catch ( e ) {
						this.container.logger.error( `An error occurred while trying to update ${ stream.user_name }'s streaming in guild ${ target.guild } and channel ${ target.channel }.` )
						this.container.logger.error( e )
					}
				}
			}
		}
	}

	protected activeStreamKey( guild: string, streamer: string ): string {
		return `twitch:active-stream/${ streamer }/${ guild }`
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		'new-streams': never;
	}
}
