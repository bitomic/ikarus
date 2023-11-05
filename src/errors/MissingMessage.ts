import { UserError } from '@sapphire/framework'

export class MissingMessageError extends UserError {
	public constructor( channelId: string, messageId: string ) {
		super( {
			identifier: 'Missing channel',
			message: `Couldn't fetch message ${ messageId } in channel ${ channelId }.`
		} )
	}
}
