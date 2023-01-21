import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { ButtonInteraction  } from 'discord.js'
import Colors from '@bitomic/material-colors'
import { resolveKey } from '@sapphire/plugin-i18next'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( interaction.customId.match( /^(role|ronce)-\d+$/ ) ) return this.some()
		return this.none()
	}

	public async run( interaction: ButtonInteraction<'cached'> ): Promise<void> {
		const [ type, roleId ] = interaction.customId.split( '-' ) as [ 'role' | 'ronce', `${ number }` ]

		const hasRole = interaction.member.roles.cache.has( roleId )
		if ( type === 'ronce' && hasRole ) {
			const description = await resolveKey( interaction, 'role-buttons:already-have' )
			void interaction.reply( {
				embeds: [ {
					color: Colors.amber.s800,
					description
				} ]
			} )
			return
		}

		const me = await interaction.guild.members.fetchMe()
		const highestRole = me.roles.highest
		const role = await interaction.guild.roles.fetch( roleId )

		if ( !role ) {
			void this.reply( interaction, Colors.red.s800, 'unknown-role' )
			return
		} else if ( role.managed ) {
			void this.reply( interaction, Colors.red.s800, 'managed-role' )
			return
		} else if ( role.rawPosition >= highestRole.rawPosition ) {
			void this.reply( interaction, Colors.amber.s800, 'higher-role' )
			return
		}

		if ( hasRole ) {
			await interaction.member.roles.remove( roleId )
			void this.reply( interaction, role.color, 'role-removed', { role: role.id } )
		} else {
			await interaction.member.roles.add( roleId )
			void this.reply( interaction, role.color, 'role-added', { role: role.id } )
		}
	}

	protected async reply( interaction: ButtonInteraction, color: number, i18nKey: string, replace?: Record<string, string> ): Promise<void> {
		const description = await resolveKey( interaction, `role-buttons:${ i18nKey }`, { replace } )
		void interaction.reply( {
			embeds: [ { color, description } ],
			ephemeral: true
		} )
	}
}
