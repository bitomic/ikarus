import { UserError } from '@sapphire/framework'
import type { PermissionResolvable } from 'discord.js'

export class MissingPermissionsError extends UserError {
	public constructor( permissions: PermissionResolvable ) {
		super( {
			identifier: 'Missing permissions',
			message: `Missing permissions: ${ permissions }.` // eslint-disable-line @typescript-eslint/no-base-to-string
		} )
	}
}
