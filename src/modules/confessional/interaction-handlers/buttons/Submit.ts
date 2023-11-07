import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ButtonInteraction, ComponentType, TextInputStyle  } from 'discord.js'
import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders'
import { EmbedLimits, TextInputLimits } from '@sapphire/discord-utilities'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button,
	name: 'confession-submit-button'
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( !interaction.customId.startsWith( 'confession-' ) ) return this.none()
		return this.some()
	}

	public async run( interaction: ButtonInteraction<'cached'> ): Promise<void> {
		const textComponent = new ActionRowBuilder<TextInputBuilder>()
			.addComponents( new TextInputBuilder( {
				custom_id: 'content',
				label: 'Mensaje',
				max_length: Math.min( EmbedLimits.MaximumDescriptionLength, TextInputLimits.MaximumValueCharacters ),
				min_length: 1,
				required: true,
				style: TextInputStyle.Paragraph,
				type: ComponentType.TextInput
			} ) )

		const modal = new ModalBuilder()
			.setTitle( 'Envía tu anécdota' )
			.setCustomId( interaction.customId )
			.addComponents( textComponent )

		await interaction.showModal( modal )
	}
}
