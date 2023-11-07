import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ButtonInteraction } from 'discord.js'
import { s } from '@sapphire/shapeshift'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( !interaction.customId.startsWith( 'notifyadd-' ) && !interaction.customId.startsWith( 'notifyremove-' ) ) return this.none()

		const roleId = s.string.parse( interaction.customId.split( '-' ).at( 1 ) )
		return this.some( {
			isRemove: interaction.customId.startsWith( 'notifyremove-' ),
			roleId
		} )
	}

	public async run( interaction: ButtonInteraction<'cached'>, { isRemove, roleId }: InteractionHandler.ParseResult<this> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )
		const role = interaction.member.roles.resolve( roleId )

		if ( isRemove && !role ) {
			await interaction.editReply( {
				content: `No tienes asignado el rol <@&${ roleId }>.`
			} )
		} else if ( !isRemove && role ) {
			await interaction.editReply( {
				content: `Ya tienes asignado el rol <@&${ role.id }>.`
			} )
		} else if ( isRemove ) {
			await interaction.member.roles.remove( roleId )
			await interaction.editReply( `Se ha retirado <@&${ roleId }> de tus roles.` )
		} else {
			await interaction.member.roles.add( roleId )
			await interaction.editReply( `Se ha añadido <@&${ roleId }> a tus roles, ahora serás notificado la próxima vez.` )
		}
	}
}
