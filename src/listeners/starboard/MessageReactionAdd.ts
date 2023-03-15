import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, type JSONEncodable, type MessageActionRowComponentBuilder } from '@discordjs/builders'
import { type APIEmbed, ButtonStyle, ChannelType, Events, type MessageReaction } from 'discord.js'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import Colors from '@bitomic/material-colors'
import { ConfigurationKey } from '@prisma/client'
import { resolveKey } from '@sapphire/plugin-i18next'
import { s } from '@sapphire/shapeshift'

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

		const { snowflake } = this.container.utilities.validation
		const configuration = models.get( 'configuration' )
		const starboardChannel = await configuration.get( message.guildId, ConfigurationKey.StarboardChannel, snowflake )
		if ( !starboardChannel ) return

		const requiredReactions = parseInt( await configuration.get( message.guildId, ConfigurationKey.StarboardCount, s.string.regex( /\d+/ ) ) ?? '3', 10 )
		if ( reaction.count < requiredReactions ) return

		const channel = await this.container.client.channels.fetch( starboardChannel )
		if ( channel?.type !== ChannelType.GuildText ) return

		const messages = models.get( 'messages' )
		await messages.assert( message )

		const { starboard } = this.container.prisma
		const stored = await starboard.findUnique( {
			where: { originalId: message.id }
		} )
		const count = message.reactions.resolve( '⭐' )?.count ?? '¿?'

		if ( stored ) {
			try {
				const pin = await channel.messages.fetch( stored.pinnedId )
				await pin.edit( {
					content: `⭐ ${ count }`
				} )
				return
			} catch ( e ) {
				this.container.logger.error( 'There was an error while trying to update a starboard message.', e )
			}
		}

		const avatar = await this.container.images.getUserAvatar( message.author )
		const embeds: Array<APIEmbed | JSONEncodable<APIEmbed>> = []

		if ( message.reference?.messageId ) {
			try {
				const quote = await message.fetchReference()

				if ( quote.content.length > 0 ) {
					const embed = new EmbedBuilder()
						.setAuthor( {
							iconURL: await this.container.images.getUserAvatar( quote.author ),
							name: await resolveKey( quote, 'general:reply-to', {
								replace: {
									user: quote.member?.nickname ?? quote.author.username
								}
							} )
						} )
						.setColor( 0x2f3136 )
						.setDescription( quote.content )
					embeds.push( embed )
				}

				if ( quote.embeds.length > 0 ) {
					embeds.push( ...quote.embeds.slice( 0, 3 ).map( i => {
						const e = new EmbedBuilder( i.toJSON() )
						e.setColor( 0x2f3136 )
						return e
					} ) )
				}
			} catch {
				this.container.logger.error( 'There was an error while fetching a referenced message for the starboard.' )
			}
		}

		const label = await resolveKey( channel, 'starboard:go-to-message' )
		const component = new ActionRowBuilder<MessageActionRowComponentBuilder>()
			.addComponents( new ButtonBuilder()
				.setLabel( label )
				.setStyle( ButtonStyle.Link )
				.setURL( message.url ) )
		const embed = new EmbedBuilder()
			.setAuthor( {
				iconURL: avatar,
				name: message.member?.nickname ?? message.author.username
			} )
			.setColor( Colors.yellow.s800 )
			.setFooter( {
				text: `${ message.id } • #${ message.channel.name }`
			} )
			.setImage( message.attachments.at( 0 )?.url ?? null )
			.setTimestamp( Date.now() )
		if ( message.content && message.content.length > 0 ) {
			embed.setDescription( message.content )
		}

		embeds.push( embed, ...message.embeds.slice( 0, 3 ) )

		const pin = await channel.send( {
			components: [ component ],
			content: `⭐ ${ count }`,
			embeds
		} )
		await starboard.create( {
			data: {
				originalId: message.id,
				pinnedId: pin.id
			}
		} )
	}
}
