import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, type JSONEncodable, type MessageActionRowComponentBuilder } from '@discordjs/builders'
import { type APIEmbed, ButtonStyle, ChannelType, Events, type Message, type MessageReaction } from 'discord.js'
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
		if ( !message.inGuild() ) return

		const models = this.container.stores.get( 'models' )
		const guildSettings = models.get( 'GuildSettings' )
		const starboardChannel = await guildSettings.get( message.guildId, 'starboard-channel' )
		if ( !starboardChannel ) return

		const requiredReactions = parseInt( await guildSettings.get( message.guildId, 'starboard-count' ) ?? '3', 10 )
		if ( reaction.count < requiredReactions ) return

		const starboardMessages = models.get( 'StarboardMessages' )
		const isPinned = await starboardMessages.has( message.guildId, message.id )

		if ( isPinned && message.inGuild() ) {
			const success = await this.updateMessage( message )
			if ( success ) return
		}

		const guild = await this.container.client.guilds.fetch( message.guildId )
		const channel = await guild.channels.fetch( starboardChannel )
		if ( channel?.type !== ChannelType.GuildText ) return

		const pin = await this.sendNewMessage( channel, message )
		if ( !pin ) return

		await starboardMessages.setMessage( message, starboardChannel, pin )
	}

	protected async updateMessage( message: Message<true> ): Promise<boolean> {
		const pin = await this.container.stores.get( 'models' ).get( 'StarboardMessages' )
			.get( message.guildId, message.id )
		if ( !pin ) return false

		try {
			const guild = await this.container.client.guilds.fetch( message.guildId )
			const channel = await guild.channels.fetch( pin.pinChannel )
			if ( !channel?.isTextBased() ) return false

			const msg = await channel.messages.fetch( pin.pinMessage )
			await msg.edit( {
				content: `⭐ ${ message.reactions.resolve( '⭐' )?.count ?? '¿?' }`
			} )
			return true
		} catch {
			return false
		}
	}

	protected async sendNewMessage( channel: TextChannel, message: Message | PartialMessage ): Promise<string | null> {
		const image = await this.container.images.getUserAvatar( message.author )
		const stars = message.reactions.resolve( '⭐' )?.count
		const label = await resolveKey( channel, 'starboard:go-to-message' )

		const embeds: (APIEmbed | JSONEncodable<APIEmbed>)[] = []

		if ( message.reference?.messageId ) {
			try {
				const quote = await message.channel.messages.fetch( message.reference.messageId )
				
				const embed = new EmbedBuilder()
					.setAuthor( {
						iconURL: await this.container.images.getUserAvatar( quote.author ),
						name: await resolveKey( quote, 'general:reply-to', { replace: { user: quote.member?.nickname ?? quote.author.username } } )
					} )
					.setColor( 0x2f3136 )
				if ( quote.content.length > 0 ) {
					embed.setDescription( quote.content )
				}
				embeds.push( embed )

				if ( quote.content.length === 0 && quote.embeds.length > 0 ) {
					embeds.push( ...quote.embeds.map( i => {
						const e = new EmbedBuilder( i.toJSON() )
						e.setColor( 0x2f3136 )
						return e
					} ) )
				}
			} catch {
				this.container.logger.warn( `An error occurred while trying to retrieve a referenced message for the starboard.` )
			}
		}

		const component = new ActionRowBuilder<MessageActionRowComponentBuilder>()
			.addComponents( new ButtonBuilder()
				.setLabel( label )
				.setStyle( ButtonStyle.Link )
				.setURL( message.url ) )
		const embed = new EmbedBuilder()
			.setAuthor( {
				iconURL: image,
				name: message.member?.nickname ?? message.author?.username ?? ''
			} )
			.setColor( Colors.yellow.s800 )
			.setFooter( {
				text: `${ message.id } • #${ 'name' in message.channel ? message.channel.name : message.channel.id }`
			} )
			.setImage( message.attachments.at( 0 )?.url ?? null )
			.setTimestamp( Date.now() )
		if ( message.content && message.content?.length > 0 ) {
			embed.setDescription( message.content )
		}
		
		embeds.push( embed, ...message.embeds )

		const pin = await channel.send( {
			components: [ component ],
			content: `⭐ ${ stars ?? '¿?' }`,
			embeds
		} )
			.catch( () => null )

		return pin?.id ?? null
	}
}
