import { UserError } from '@sapphire/framework'

export class MissingChannelError extends UserError {
	public constructor( channelId: string ) {
		super( {
			identifier: 'Missing channel',
			message: `Couldn't fetch channel: ${ channelId }.`
		} )
	}
}
