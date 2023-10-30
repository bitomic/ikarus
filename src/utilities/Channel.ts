import { type Channel, ChannelType, type GuildTextBasedChannel, type MappedChannelCategoryTypes, PermissionFlagsBits, type PermissionResolvable, type TextChannel, ThreadAutoArchiveDuration, type ThreadChannel } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Utility } from '@sapphire/plugin-utilities-store'
import { MissingChannelError } from '../errors/MissingChannel.js'
import { MissingPermissionsError } from '../errors/MissingPermissions.js'

@ApplyOptions<Utility.Options>( {
	name: 'channel'
} )
export class ChannelUtility extends Utility {
	public canSendMessages( channel: Channel | null ): channel is GuildTextBasedChannel {
		const bot = this.container.client.user
		if ( !bot ) return false

		return channel?.isTextBased() && !channel.isDMBased() && channel.permissionsFor( bot )?.has( 'SendMessages' ) || false
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

	public async getChannel<T extends ChannelType.GuildAnnouncement | ChannelType.GuildVoice | ChannelType.GuildText | ChannelType.GuildStageVoice | ChannelType.GuildForum>( channelId: string, type: T, permissions?: PermissionResolvable ): Promise<MappedChannelCategoryTypes[ T ]> {
		const channel = await this.container.client.channels.fetch( channelId ) as MappedChannelCategoryTypes[ T ]
		if ( channel.type !== type ) throw new MissingChannelError( channelId )
		if ( !permissions ) return channel

		const bot = this.container.client.user
		if ( bot && channel.permissionsFor( bot )?.has( permissions ) ) {
			return channel
		}
		throw new MissingPermissionsError( permissions )
	}
}

declare module '@sapphire/plugin-utilities-store' {
	export interface Utilities {
		channel: ChannelUtility
	}
}
