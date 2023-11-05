import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { EmbedLimits, MessageLimits, SnowflakeRegex, TextInputLimits } from '@sapphire/discord-utilities'
import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { type Message, type StringSelectMenuInteraction, TextInputStyle } from 'discord.js'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.SelectMenu,
	name: 'customize-message-menu'
} )
export class UserHandler extends InteractionHandler {
	public readonly Options = s.enum( ...[
		'content',
		'description',
		'add-field',
		'add-inline-field',
		'remove-fields',
		'author',
		'footer'
	] as const )

	public override async parse( interaction: StringSelectMenuInteraction<'cached'> ) {
		if ( !interaction.customId.startsWith( 'msgedit-' ) ) return this.none()

		const messageId = s.string.regex( SnowflakeRegex ).run( interaction.customId.split( '-' ).at( 1 ) )
		if ( messageId.isErr() ) return this.none()

		try {
			const message = await this.container.stores.get( 'models' ).get( 'messages' )
				.get( messageId.unwrap() )
			const option = this.Options.parse( interaction.values[ 0 ] )

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

	public override async run( interaction: StringSelectMenuInteraction<'cached'>, result: InteractionHandler.ParseResult<this> ) {
		const { message, option } = result

		if ( option === 'remove-fields' ) {
			await this.removeFields( interaction, result )
			return
		}

		const createModal = this.createModal.bind( undefined, message.id, option )
		let modal: ModalBuilder
		const embed = this.getMessageEmbed( message )

		if ( option === 'add-field' || option === 'add-inline-field' ) {
			const fields = embed.data.fields?.length || 0
			if ( fields >= EmbedLimits.MaximumFields ) {
				await interaction.reply( {
					content: `Embeds can't have more than ${ EmbedLimits.MaximumFields } fields.`,
					ephemeral: true
				} )
				return
			}

			const title = option === 'add-field' ? 'Add field' : 'Add inline field'
			modal = createModal(
				title,
				...this.getEmbedFieldInputs( option === 'add-inline-field' )
			)
		} else if ( option === 'author' || option === 'footer' ) {
			const inputs = this.getEmbedAuthorFooterInputs( { embed, prefix: option } )
			modal = createModal( `Set ${ option }`, ...inputs )
		} else if ( option === 'content' ) {
			modal = createModal(
				'Set message content',
				new TextInputBuilder()
					.setCustomId( 'content' )
					.setLabel( 'Content' )
					.setMaxLength( MessageLimits.MaximumLength )
					.setRequired( false )
					.setStyle( TextInputStyle.Paragraph )
					.setValue( message.content )
			)
		} else {
			const color = embed.data.color?.toString( 16 ).padStart( 6, '0' ) ?? '000000'

			modal = createModal(
				'Set embed description',
				new TextInputBuilder()
					.setCustomId( 'description' )
					.setLabel( 'Description' )
					.setMaxLength( TextInputLimits.MaximumValueCharacters )
					.setRequired( false )
					.setStyle( TextInputStyle.Paragraph )
					.setValue( embed.data.description ?? '' ),
				new TextInputBuilder()
					.setCustomId( 'color' )
					.setLabel( 'Hex color' )
					.setMaxLength( 7 )
					.setMinLength( 6 )
					.setRequired( true )
					.setStyle( TextInputStyle.Short )
					.setValue( `#${ color }` )
			)
		}

		await interaction.showModal( modal )
	}

	private createModal( messageId: string, option: string, title: string, ...inputs: TextInputBuilder[] ): ModalBuilder {
		const modal = new ModalBuilder()
			.setCustomId( `msgedit-${ option }-${ messageId }` )
			.setTitle( title )

		const rows = inputs.map( input => new ActionRowBuilder<TextInputBuilder>().addComponents( input ) )
		modal.addComponents( rows )

		return modal
	}

	private getEmbedAuthorFooterInputs( options: { embed: EmbedBuilder, prefix: 'author' | 'footer' } ): TextInputBuilder[] {
		const { embed, prefix } = options
		const name = prefix === 'author' ? embed.data.author?.name : embed.data.footer?.text

		return [
			new TextInputBuilder()
				.setCustomId( `${ prefix }-name` )
				.setLabel( 'Name' )
				.setMaxLength( EmbedLimits.MaximumAuthorNameLength )
				.setMinLength( 1 )
				.setRequired( true )
				.setStyle( TextInputStyle.Short )
				.setValue( name ?? '' ),
			new TextInputBuilder()
				.setCustomId( `${ prefix }-icon` )
				.setLabel( 'Icon' )
				.setStyle( TextInputStyle.Short )
				.setValue( embed.data[ prefix ]?.icon_url ?? '' )
		]
	}

	private getEmbedFieldInputs( inline = false ): TextInputBuilder[] {
		const prefix = inline ? 'inline-field' : 'field'
		return [
			new TextInputBuilder()
				.setCustomId( `${ prefix }-name` )
				.setLabel( 'Name' )
				.setMaxLength( EmbedLimits.MaximumFieldNameLength )
				.setMinLength( 1 )
				.setRequired( true )
				.setStyle( TextInputStyle.Short ),
			new TextInputBuilder()
				.setCustomId( `${ prefix }-value` )
				.setLabel( 'Content' )
				.setMaxLength( EmbedLimits.MaximumFieldValueLength )
				.setMinLength( 1 )
				.setRequired( true )
				.setStyle( TextInputStyle.Paragraph )
		]
	}

	private getMessageEmbed( message: Message<true> ): EmbedBuilder {
		const raw = message.embeds.at( 0 )
		return new EmbedBuilder( raw?.data )
	}

	private async removeFields( interaction: StringSelectMenuInteraction<'cached'>, result: InteractionHandler.ParseResult<this> ) {
		const raw = result.message.embeds.at( 0 )
		if ( !raw?.fields.length ) {
			await interaction.reply( {
				content: 'The message doesn\'t have any embed, or it didn\'t have any fields to remove.',
				ephemeral: true
			} )
			return
		}

		const embed = new EmbedBuilder( raw.data )
		embed.setFields()
		await result.message.edit( {
			embeds: [ embed ]
		} )
		await interaction.reply( {
			content: 'The fields have been removed successfully.',
			ephemeral: true
		} )
	}
}
