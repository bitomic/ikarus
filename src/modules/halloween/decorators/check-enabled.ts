import { container } from '@sapphire/pieces'
import type { ChatInputCommandInteraction, } from 'discord.js'
import { Colors } from '@bitomic/material-colors'
import { halloweenGuild } from 'src/drizzle/schema.js'
import { eq } from 'drizzle-orm'

// eslint-disable-next-line arrow-body-style
export const checkEnabled = ( ephemeral = false ) => {
	return ( _target: unknown, _methodName: string, descriptor: PropertyDescriptor ) => {
		const original = descriptor.value as ( registry: ChatInputCommandInteraction<'cached'> ) => void

		descriptor.value = async function( interaction: ChatInputCommandInteraction<'cached'> ) {
			await interaction.deferReply( { ephemeral } )

			const [ guild ] = await container.drizzle.select()
				.from( halloweenGuild )
				.where( eq( halloweenGuild.id, interaction.guildId ) )

			if ( !guild?.enabled ) {
				await container.utilities.embed.i18n( interaction, {
					color: Colors.amber.s800,
					description: 'halloween:not-enabled'
				}, null, true )
				return
			}

			original.call( this, interaction )
		}
	}
}
