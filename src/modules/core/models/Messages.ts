import { type PieceOptions, UserError } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { Message } from 'discord.js'
import { message as Messages } from '../../../drizzle/schema.js'
import { Model } from '#framework/Model'

@ApplyOptions<PieceOptions>( {
	name: 'messages'
} )
export class MessagesModel extends Model {
	public async assert( message: Message<true> ): Promise<void> {
		const channel = message.channel.isThread() ? message.channel.parentId : message.channelId
		if ( !channel ) {
			throw new UserError( {
				context: message,
				identifier: 'unknown-channel',
				message: 'Couldn\'t find the message\'s channel.'
			} )
		}

		await this.container.drizzle.insert( Messages )
			.values( {
				author: message.author.id,
				channel,
				guild: message.guildId,
				message: message.id,
				thread: message.channel.isThread() ? message.channelId : null
			} )
			.catch( () => null )
	}
}

declare global {
	interface ModelRegistryEntries {
		messages: MessagesModel
	}
}
