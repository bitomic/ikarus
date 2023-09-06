import { Events, type MessageReaction, type User } from 'discord.js'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { ConfigurationKey } from '@prisma/client'
import { s } from '@sapphire/shapeshift'
import type { StarboardPayload } from '../../scheduled-tasks/Starboard.js'

@ApplyOptions<ListenerOptions>( {
	event: Events.MessageReactionAdd
} )
export class UserEvent extends Listener {
	public async run( reaction: MessageReaction, user: User ): Promise<void> {
		if ( reaction.emoji.name !== '⭐' ) return
		await reaction.fetch()
		const { message } = reaction
		if ( !message.inGuild() ) return

		const hasEnoughReactions = await this.hasEnoughReactions( reaction.count, message.guildId )
		if ( !hasEnoughReactions ) return

		const models = this.container.stores.get( 'models' )
		const messages = models.get( 'messages' )
		await messages.assert( message )
		await this.container.redis.sadd( `starboard:${ message.id }`, user.id )

		void this.container.tasks.create( 'starboard', {
			messageId: message.id
		} satisfies StarboardPayload, 0 )
	}

	protected async hasEnoughReactions( count: number, guildId: string ): Promise<boolean> {
		const models = this.container.stores.get( 'models' )

		const configuration = models.get( 'configuration' )

		const requiredReactions = parseInt( await configuration.get( guildId, ConfigurationKey.StarboardCount, s.string.regex( /\d+/ ) ) ?? '3', 10 )
		return count >= requiredReactions
	}
}
