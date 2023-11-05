import { EmbedBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { SnowflakeRegex } from '@sapphire/discord-utilities'
import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { type ModalSubmitInteraction } from 'discord.js'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
	name: 'customize-message-modal'
} )
export class UserHandler extends InteractionHandler {
	public readonly Options = s.enum( ...[
		'content',
		'description',
		'add-field',
		'add-inline-field',
		'author',
		'footer'
	] as const )

	public override async parse( interaction: ModalSubmitInteraction<'cached'> ) {
		if ( !interaction.customId.startsWith( 'msgedit-' ) ) return this.none()

		const messageId = s.string.regex( SnowflakeRegex ).run( interaction.customId.split( '-' ).at( -1 ) )
		if ( messageId.isErr() ) return this.none()

		try {
			const message = await this.container.stores.get( 'models' ).get( 'messages' )
				.get( messageId.unwrap() )
			const option = this.Options.parse( interaction.customId.replace( 'msgedit-', '' ).replace( `-${ messageId.unwrap() }`, '' ) )

			return this.some( { message, option } )
		} catch ( e ) {
			this.container.logger.error( e )
			await interaction.reply( {
				content: 'There was an unknown error with your request.',
				ephemeral: true
			} )
			return this.none()
		}
	}

	public override async run( interaction: ModalSubmitInteraction<'cached'>, result: InteractionHandler.ParseResult<this> ) {
		await interaction.reply( {
			content: 'Please wait while the message is modified.',
			ephemeral: true
		} )
		const { message, option } = result
		const fields = interaction.fields.fields.reduce( ( list, item ) => {
			list.set( item.customId, item.value )
			return list
		}, new Map<string, string>() )

		try {
			const embed = new EmbedBuilder( message.embeds.at( 0 )?.data )

			if ( option === 'content' ) {
				const content = fields.get( 'content' ) ?? ''

				await message.edit( { content } )
			} else if ( option === 'add-field' || option === 'add-inline-field' ) {
				const prefix = option === 'add-field' ? 'field' : 'inline-field'
				const name = s.string.parse( fields.get( `${ prefix }-name` ) )
				const value = s.string.parse( fields.get( `${ prefix }-value` ) )
				embed.addFields( {
					inline: option === 'add-inline-field',
					name,
					value
				} )
			} else if ( option === 'author' || option === 'footer' ) {
				const name = s.string.parse( fields.get( `${ option }-name` ) )
				const url = s.string.url().optional.default( '' ).parse( `${ option }-icon` )

				if ( option === 'author' ) {
					embed.setAuthor( { name, url } )
				} else {
					embed.setFooter( { iconURL: url, text: name } )
				}
			} else {
				const description = s.string.optional.parse( fields.get( 'description' ) )
				const color = s.string
					.regex( /^#?[a-f0-9]{6}$/i )
					.transform( value => value.replace( '#', '' ) )
					.transform( hex => parseInt( hex, 16 ) )
					.parse( fields.get( 'color' ) )

				embed.setColor( color )
				embed.setDescription( description || null )
			}

			if ( option !== 'content' ) {
				await message.edit( { embeds: [ embed ] } )
			}

			await interaction.deleteReply()
		} catch ( e ) {
			this.container.logger.error( e )
			await interaction.editReply( 'There was an error with the edit.' )
		}
	}
}
