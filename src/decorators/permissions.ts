import { container } from '@sapphire/pieces'
import { resolveKey } from '@sapphire/plugin-i18next'
import type { ChatInputCommandInteraction, PermissionResolvable } from 'discord.js'
import { Colors } from '@bitomic/material-colors'

// eslint-disable-next-line arrow-body-style
export const permissions = ( permission: PermissionResolvable, i18nkey: string ) => {
	return ( _target: unknown, _methodName: string, descriptor: PropertyDescriptor ) => {
		const original = descriptor.value as ( registry: ChatInputCommandInteraction<'cached'> ) => void

		descriptor.value = async function( interaction: ChatInputCommandInteraction<'cached'> ) {
			const hasPermissions = interaction.memberPermissions.has( permission, true )

			if ( !hasPermissions ) {
				await container.utilities.embed.i18n( interaction, {
					color: Colors.amber.s800,
					description: 'errors:missing-permissions'
				}, { permissions: await resolveKey( interaction, `misc:permissions.${ i18nkey }` ) }, true )
				return
			}

			original.call( this, interaction )
		}
	}
}
