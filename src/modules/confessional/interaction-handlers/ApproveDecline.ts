import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { ButtonInteraction  } from 'discord.js'
import { Colors } from '@bitomic/material-colors'
import { EmbedBuilder } from '@discordjs/builders'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( interaction.customId.startsWith( 'confession_' ) ) return this.some()
		return this.none()
	}

	public async run( interaction: ButtonInteraction<'cached'> ): Promise<void> {
		await interaction.reply( {
			content: '¡Gracias por actualizar el estado de la anécdota!',
			ephemeral: true
		} )

		const isApprove = interaction.customId.endsWith( 'approve' )

		await interaction.message.fetch()
		const [ source ] = interaction.message.embeds
		if ( !source ) return

		const embed = new EmbedBuilder( source.data )
			.setColor( isApprove ? Colors.green.s800 : Colors.red.s800 )
			.addFields( {
				name: 'Revisado',
				value: `Esta anécdota fue revisada por <@!${ interaction.user.id }> (${ interaction.user.username }).`
			} )
		await interaction.message.edit( {
			components: [],
			embeds: [ embed ]
		} )
	}
}
