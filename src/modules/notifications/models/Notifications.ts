import { ApplyOptions } from '@sapphire/decorators'
import { Model } from '#framework/Model'
import { type PieceOptions } from '@sapphire/framework'
import type { GuildTextBasedChannel } from 'discord.js'
import { channelSettings } from '#drizzle/schema'
import { eq } from 'drizzle-orm'

@ApplyOptions<PieceOptions>( {
	name: 'notifications'
} )
export class NotificationsModel extends Model {
	public async setChannelForRole( guild: string, channel: string, role: string ): Promise<void> {
		await this.container.stores.get( 'models' ).get( 'channel-settings' )
			.set( guild, channel, `notification-${ role }` )
	}

	public async getChannel( guild: string, role: string ): Promise<GuildTextBasedChannel> {
		const channel = await this.container.stores.get( 'models' ).get( 'channel-settings' )
			.getChannel( guild, `notification-${ role }` )
		return channel
	}

	public async remove( role: string ): Promise<void> {
		await this.container.drizzle.delete( channelSettings )
			.where( eq( channelSettings.feature, `notification-${ role }` ) )
	}
}

declare global {
	interface ModelRegistryEntries {
		'notifications': NotificationsModel
	}
}
