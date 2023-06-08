import type { Channel, GuildTextBasedChannel, PermissionResolvable } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Utility } from '@sapphire/plugin-utilities-store'

@ApplyOptions<Utility.Options>( {
	name: 'channel'
} )
export class ChannelUtility extends Utility {
	public canSendMessages( channel: Channel | null ): channel is GuildTextBasedChannel {
		const bot = this.container.client.user
		if ( !bot ) return false

		return channel && this.isGuildText( channel ) && channel.permissionsFor( bot )?.has( 'SendMessages' ) || false
	}

	public async getGuildTextChannel( channelId: string, permissions?: PermissionResolvable ): Promise<GuildTextBasedChannel | null> {
		const channel = await this.container.client.channels.fetch( channelId )
		if ( !channel || !this.isGuildText( channel ) ) return null
		if ( !permissions ) return channel

		const bot = this.container.client.user
		if ( bot && channel.permissionsFor( bot )?.has( permissions ) ) {
			return channel
		}
		return null
	}

	public isGuildText( channel: Channel ): channel is GuildTextBasedChannel {
		return channel.isTextBased() && !channel.isDMBased()
	}
}

declare module '@sapphire/plugin-utilities-store' {
	export interface Utilities {
		channel: ChannelUtility
	}
}
