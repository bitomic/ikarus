import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { ButtonInteraction  } from 'discord.js'
import { Colors } from '@bitomic/material-colors'
import { EmbedBuilder } from '@discordjs/builders'
import { s } from '@sapphire/shapeshift'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button,
	name: 'confession-process-button'
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( !interaction.customId.startsWith( 'creview' ) ) return this.none()

		const parsed = s.enum( ...[ 'approve', 'decline' ] as const ).run( interaction.customId.split( '-' ).at( 1 ) )
		if ( parsed.isErr() ) return this.none()

		return this.some( {
			isApprove: parsed.unwrap() === 'approve'
		} )
	}

	public async run( interaction: ButtonInteraction<'cached'>, { isApprove }: InteractionHandler.ParseResult<this> ): Promise<void> {
		await interaction.reply( {
			content: 'Actualizando estado, por favor espera un momento...',
			ephemeral: true
		} )

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
		await interaction.deleteReply()

		if ( !isApprove ) {
			await this.container.stores.get( 'models' ).get( 'confessions' )
				.remove( interaction.message.id )
		}
	}
}
