import { Events, type MessageReaction, type User } from 'discord.js'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'

@ApplyOptions<ListenerOptions>( {
	event: Events.MessageReactionRemove
} )
export class UserEvent extends Listener {
	public async run( reaction: MessageReaction, user: User ): Promise<void> {
		if ( reaction.emoji.name !== '⭐' ) return
		await reaction.fetch()
		const { message } = reaction
		if ( !message.inGuild() ) return

		await this.container.redis.srem( `starboard:${ message.id }`, user.id )

		const { pinned } = await this.container.prisma.starboard.findUnique( {
			include: { pinned: true },
			where: {
				originalId: message.id
			}
		} ) ?? {}
		if ( !pinned ) return

		const channel = await this.container.client.channels.fetch( pinned.thread ?? pinned.channel )
		if ( !channel?.isTextBased() ) return

		const pin = await channel.messages.fetch( pinned.message )
		const count = await this.container.redis.scard( `starboard:${ message.id }` )
		await pin.edit( {
			content: `⭐ ${ count }`
		} )
	}
}
