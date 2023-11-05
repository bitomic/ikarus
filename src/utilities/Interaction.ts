import type { ChatInputCommandInteraction, GuildTextBasedChannel, Interaction, Message } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Utility } from '@sapphire/plugin-utilities-store'
import { s } from '@sapphire/shapeshift'
import { MissingChannelError } from '../errors/MissingChannel.js'
import { MessageLinkRegex, SnowflakeRegex } from '@sapphire/discord-utilities'
import { MissingMessageError } from '../errors/MissingMessage.js'

@ApplyOptions<Utility.Options>( {
	name: 'interaction'
} )
export class InteractionUtility extends Utility {
	public async getCustomizableMessage( interaction: ChatInputCommandInteraction<'cached'>, messageOption = 'message' ) {
		const option = interaction.options.getString( messageOption )
		const messages = this.container.stores.get( 'models' ).get( 'messages' )
		let message: Message<true>

		if ( option ) {
			const messageId = this.parseMessageArgument( option )
			message = await messages.get( messageId )
		} else {
			message = await messages.findLatestByUser( interaction.channelId, interaction.client.user.id )
		}

		if ( message.author.id !== interaction.client.user.id ) {
			throw new MissingMessageError( interaction.channelId, message.id )
		}

		return message
	}

	public async getInteractionChannel( interaction: Interaction<'cached'> ): Promise<GuildTextBasedChannel> {
		if ( interaction.channel ) return interaction.channel

		const channelId = s.string.parse( interaction.channelId )
		const channel = await this.container.client.channels.fetch( channelId )
		if ( channel?.isTextBased() && !channel.isDMBased() ) return channel

		throw new MissingChannelError( channelId )
	}

	private parseMessageArgument( option: string ): string {
		const isSnowflake = s.string.regex( SnowflakeRegex ).run( option )
		if ( isSnowflake.isOk() ) return isSnowflake.unwrap()

		return s.string.parse( MessageLinkRegex.exec( option )?.groups?.messageId )
	}
}

declare module '@sapphire/plugin-utilities-store' {
	export interface Utilities {
		interaction: InteractionUtility
	}
}
