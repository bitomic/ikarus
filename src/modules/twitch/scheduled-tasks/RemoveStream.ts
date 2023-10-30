import { TwitchTask } from './_TwitchTask.js'
import { EmbedBuilder, hyperlink } from '@discordjs/builders'
import type { EmbedField, GuildTextBasedChannel, TextBasedChannel } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Colors } from '@bitomic/material-colors'
import { resolveKey } from '@sapphire/plugin-i18next'
import type { ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import type { Stream } from '#lib/Twitch'

interface TaskPayload {
	user: string
}

@ApplyOptions<ScheduledTaskOptions>( {
	enabled: true,
	name: 'remove-stream'
} )
export class UserTask extends TwitchTask {
	public override async run( { user }: TaskPayload ): Promise<void> {
		if ( !this.isReady() ) return

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
				if ( !embedData ) {
					continue
				}

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

				embed.setImage( null )

				await message.edit( { embeds: [ embed ] } )
			} catch ( e ) {
				this.container.logger.warn( `Task[RemoveStream]: There was an error while removing ${ key }.`, e )
			}
		}
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
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		'remove-stream': never;
	}
}
