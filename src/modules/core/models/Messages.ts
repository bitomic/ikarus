import { ApplyOptions } from '@sapphire/decorators'
import { Model } from '#framework/Model'
import { type PieceOptions, UserError } from '@sapphire/framework'
import { message } from '#drizzle/schema'
import type { Message } from 'discord.js'
import { s } from '@sapphire/shapeshift'
import { and, desc, eq } from 'drizzle-orm'
import { MissingChannelError } from '../../../errors/MissingChannel.js'
import { MissingMessageError } from '../../../errors/MissingMessage.js'

@ApplyOptions<PieceOptions>( {
	name: 'messages'
} )
export class MessagesModel extends Model {
	public async create( options: Message<true> ): Promise<void> {
		const { author, channel } = options
		const isThread = channel.isThread()
		const channelId = isThread ? s.string.parse( channel.parentId ) : channel.id
		const threadId = isThread ? options.channelId : null

		await this.container.drizzle.insert( message )
			.values( {
				author: author.id,
				channel: channelId,
				guild: options.guildId,
				message: options.id,
				thread: threadId
			} )
	}

	public async get( id: string ): Promise<Message<true>> {
		const [ stored ] = await this.container.drizzle.select()
			.from( message )
			.where( eq( message.message, id ) )
			.limit( 1 )

		if ( !stored ) throw new UserError( { identifier: 'Missing message' } )

		const msg = await this.fetch( stored )
		return msg
	}

	public async findLatestByUser( channel: string, user: string ): Promise<Message<true>> {
		const [ stored ] = await this.container.drizzle.select()
			.from( message )
			.where( and(
				eq( message.author, user ),
				eq( message.channel, channel )
			) )
			.orderBy( desc( message.message ) )
			.limit( 1 )

		if ( !stored ) throw new UserError( { identifier: 'Missing message' } )

		const msg = await this.fetch( stored )
		return msg
	}

	private async fetch( options: typeof message.$inferSelect ): Promise<Message<true>> {
		const channel = await this.container.client.channels.fetch( options.channel )
		if ( !channel || channel.isDMBased() || !( 'threads' in channel ) ) {
			throw new MissingChannelError( options.channel )
		}

		const target = options.thread
			? await channel.threads.fetch( options.thread )
			: channel
		const msg = await target?.messages.fetch( options.message )
		if ( !msg ) throw new MissingMessageError( options.channel, options.message )

		return msg
	}
}

declare global {
	interface ModelRegistryEntries {
		messages: MessagesModel
	}
}
