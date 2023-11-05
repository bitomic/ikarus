import type { GuildTextBasedChannel, Interaction } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Utility } from '@sapphire/plugin-utilities-store'
import { s } from '@sapphire/shapeshift'
import { MissingChannelError } from '../errors/MissingChannel.js'

@ApplyOptions<Utility.Options>( {
	name: 'interaction'
} )
export class InteractionUtility extends Utility {
	public async getInteractionChannel( interaction: Interaction<'cached'> ): Promise<GuildTextBasedChannel> {
		if ( interaction.channel ) return interaction.channel

		const channelId = s.string.parse( interaction.channelId )
		const channel = await this.container.client.channels.fetch( channelId )
		if ( channel?.isTextBased() && !channel.isDMBased() ) return channel

		throw new MissingChannelError( channelId )
	}
}

declare module '@sapphire/plugin-utilities-store' {
	export interface Utilities {
		interaction: InteractionUtility
	}
}
