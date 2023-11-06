import { ApplyOptions } from '@sapphire/decorators'
import { Model } from '#framework/Model'
import { type PieceOptions, UserError } from '@sapphire/framework'
import { channelSettings } from '#drizzle/schema'
import type { GuildTextBasedChannel } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { MissingChannelError } from '../../../errors/MissingChannel.js'

@ApplyOptions<PieceOptions>( {
	name: 'channel-settings'
} )
export class ChannelSettingsModel extends Model {
	public async getChannel( guild: string, feature: string ): Promise<GuildTextBasedChannel> {
		const [ stored ] = await this.container.drizzle.select()
			.from( channelSettings )
			.where( and(
				eq( channelSettings.feature, feature ),
				eq( channelSettings.guild, guild )
			) )
			.limit( 1 )

		if ( !stored ) {
			throw new UserError( {
				identifier: 'Feature channel not set'
			} )
		}

		const channel = await this.container.client.channels.fetch( stored.channel )
		if ( !channel || channel.isDMBased() || channel.guildId !== guild || !channel.isTextBased() ) {
			throw new MissingChannelError( stored.channel )
		}

		return channel
	}

	public async set( guild: string, channel: string, feature: string ): Promise<void> {
		await this.container.drizzle.insert( channelSettings )
			.values( {
				channel,
				feature,
				guild
			} )
			.onDuplicateKeyUpdate( {
				set: {
					channel
				}
			} )
	}
}

declare global {
	interface ModelRegistryEntries {
		'channel-settings': ChannelSettingsModel
	}
}
