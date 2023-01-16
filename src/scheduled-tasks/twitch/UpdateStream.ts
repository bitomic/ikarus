import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import type { ActiveStream } from '../../utils'
import { ApplyOptions } from '@sapphire/decorators'
import { ChannelType } from 'discord.js'
import { EmbedBuilder } from '@discordjs/builders'
import { resolveKey } from '@sapphire/plugin-i18next'
import { Time } from '@sapphire/duration'
import { UserError } from '@sapphire/framework'

@ApplyOptions<ScheduledTaskOptions>( {
	name: 'update-stream'
} )
export class UserTask extends ScheduledTask {
	public override async run( { key }: { key: string } ): Promise<void> {
		await this.container.ready()

		try {
			const activeStream = await this.container.redis.hgetall( key ) as unknown as ActiveStream
			const guild = await this.container.client.guilds.fetch( activeStream.guild )
			const channel = await guild.channels.fetch( activeStream.channel )
			if ( channel?.type !== ChannelType.GuildText ) {
				throw new UserError( { context: activeStream, identifier: 'InvalidGuild' } )
			}
			const message = await channel.messages.fetch( activeStream.message )

			const stream = await this.container.twitch.getUserStream( activeStream.streamer )
			const [ sourceEmbed ] = message.embeds
			const embed = new EmbedBuilder( sourceEmbed?.toJSON() )

			if ( !stream ) {
				const vod = `https://twitch.tv/videos/${ activeStream.vod }`
				embed.setAuthor( {
					name: await resolveKey( guild, 'twitch:was-live', { replace: { user: activeStream.streamer } } )
				} )
					.spliceFields( 1, 1, {
						inline: true,
						name: 'VOD',
						value: vod
					} )
					.setURL( vod )
				await message.edit( { embeds: [ embed ] } )
				await this.container.redis.del( key )
				return
			}

			const viewersField = embed.data.fields?.at( 1 )
			if ( !viewersField ) {
				throw new UserError( { context: activeStream, identifier: 'NoViewersField' } )
			}
			viewersField.value = `${ stream.viewer_count }`

			embed.spliceFields( 1, 1, viewersField )
				.setImage( stream.thumbnail_url.replace( '-{width}x{height}', '' ) )
			await message.edit( { embeds: [ embed ] } )

			await this.container.tasks.create( 'update-stream', { key }, Time.Minute * 5 )
		} catch ( e ) {
			this.container.logger.error( 'A stream update will be removed because of an error.' )
			this.container.logger.error( e )
			await this.container.redis.del( key )
		}
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		'update-stream': never;
	}
}
