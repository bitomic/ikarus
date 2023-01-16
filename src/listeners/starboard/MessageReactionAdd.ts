import { ButtonStyle, ChannelType, ComponentType, Events, type Message, type MessageReaction } from 'discord.js'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import type { PartialMessage, TextChannel } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import Colors from '@bitomic/material-colors'
import { resolveKey } from '@sapphire/plugin-i18next'

@ApplyOptions<ListenerOptions>( {
	event: Events.MessageReactionAdd
} )
export class UserEvent extends Listener {
	public async run( reaction: MessageReaction ): Promise<void> {
		if ( reaction.emoji.name !== '⭐' ) return
		await reaction.fetch()
		const { message } = reaction
		if ( !message.guildId || message.partial ) return

		const models = this.container.stores.get( 'models' )
		const guildSettings = models.get( 'GuildSettings' )
		const starboardChannel = await guildSettings.get( message.guildId, 'starboard-channel' )
		console.log( { starboardChannel } )
		if ( !starboardChannel ) return

		const requiredReactions = parseInt( await guildSettings.get( message.guildId, 'starboard-count' ) ?? '3', 10 )
		if ( reaction.count < requiredReactions ) return

		const starboardMessages = models.get( 'StarboardMessages' )
		const isPinned = await starboardMessages.has( message.guildId, message.id )

		if ( isPinned ) {
			const pin = await starboardMessages.get( message.guildId, message.id )
			if ( pin ) {
				const guild = await this.container.client.guilds.fetch( message.guildId )
				const channel = await guild.channels.fetch( pin.pinChannel )
					.catch( () => null )
				if ( channel?.isTextBased() ) {
					const msg = await channel.messages.fetch( pin.pinMessage )
						.catch( () => null )
					if ( msg ) {
						await msg.edit( {
							content: `⭐ ${ message.reactions.resolve( '⭐' )?.count ?? '¿?' }`
						} )
						return
					}
				}
			}
		}

		const guild = await this.container.client.guilds.fetch( message.guildId )
		const channel = await guild.channels.fetch( starboardChannel )
		if ( channel?.type !== ChannelType.GuildText ) return

		const pin = await this.sendNewMessage( channel, message )
		if ( !pin ) return

		await starboardMessages.set( {
			channel: message.channel.isThread() ? message.channel.parentId ?? '' : message.channelId,
			guild: message.guildId,
			message: message.id,
			pinChannel: starboardChannel,
			pinMessage: pin,
			thread: message.channel.isThread() ? message.channelId : undefined,
			user: reaction.message.author?.id ?? ''
		} )
	}

	protected async sendNewMessage( channel: TextChannel, message: Message | PartialMessage ): Promise<string | null> {
		const image = await this.container.images.getUserAvatar( message.author )
		const stars = message.reactions.resolve( '⭐' )?.count
		const label = await resolveKey( channel, 'starboard:go-to-message' )
		const pin = await channel.send( {
			components: [ {
				components: [ {
					label,
					style: ButtonStyle.Link,
					type: ComponentType.Button,
					url: message.url
				} ],
				type: ComponentType.ActionRow
			} ],
			content: `⭐ ${ stars ?? '¿?' }`,
			embeds: [ {
				author: {
					icon_url: image,
					name: message.author?.username ?? ''
				},
				color: Colors.yellow.s800,
				description: message.content ?? '',
				footer: {
					text: `${ message.id } • #${ 'name' in message.channel ? message.channel.name : message.channel.id }`
				},
				image: {
					url: message.attachments.at( 0 )?.url ?? ''
				},
				timestamp: new Date().toISOString()
			}, ...message.embeds ]
		} )
			.catch( () => null )

		return pin?.id ?? null
	}
}
