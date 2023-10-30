import { Channel, ChannelType, GuildTextBasedChannel, PermissionFlagsBits, PermissionResolvable, TextChannel, ThreadAutoArchiveDuration, ThreadChannel } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Utility } from '@sapphire/plugin-utilities-store'
import { MissingChannelError } from 'src/errors/MissingChannel.js'
import { MissingPermissionsError } from 'src/errors/MissingPermissions.js'

@ApplyOptions<Utility.Options>( {
	name: 'channel'
} )
export class ChannelUtility extends Utility {
	public canSendMessages( channel: Channel | null ): channel is GuildTextBasedChannel {
		const bot = this.container.client.user
		if ( !bot ) return false

		return channel && this.isGuildText( channel ) && channel.permissionsFor( bot )?.has( 'SendMessages' ) || false
	}

	public async findThreadByName( channel: TextChannel, name: string, type: ChannelType.PublicThread | ChannelType.PrivateThread ): Promise<ThreadChannel> {
		const { threads } = await channel.threads.fetch()
		const target = threads.find( t => t.name === name )
		if ( target ) return target

		const bot = this.container.client.user
		const permission = type === ChannelType.PublicThread ? PermissionFlagsBits.CreatePublicThreads : PermissionFlagsBits.CreatePrivateThreads
		if ( !bot || !channel.permissionsFor( bot )?.has( permission ) ) throw new MissingPermissionsError( permission )

		return channel.threads.create( {
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
			invitable: false,
			name,
			type
		} )
	}

	public async getGuildTextChannel( channelId: string, permissions?: PermissionResolvable ): Promise<GuildTextBasedChannel> {
		const channel = await this.container.client.channels.fetch( channelId )
		if ( !channel || !this.isGuildText( channel ) ) throw new MissingChannelError( channelId )
		if ( !permissions ) return channel

		const bot = this.container.client.user
		if ( bot && channel.permissionsFor( bot )?.has( permissions ) ) {
			return channel
		}
		throw new MissingPermissionsError( permissions )
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
