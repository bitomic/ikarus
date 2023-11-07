import { ApplyOptions } from '@sapphire/decorators'
import { Model } from '#framework/Model'
import { type PieceOptions } from '@sapphire/framework'
import { confessions } from '#drizzle/schema'
import type { Message } from 'discord.js'
import { eq } from 'drizzle-orm'

@ApplyOptions<PieceOptions>( {
	name: 'confessions'
} )
export class ConfessionsModel extends Model {
	public async create( message: Message<true>, user: string, isPrivate = true ): Promise<void> {
		await this.container.drizzle.insert( confessions )
			.values( {
				guild: message.guildId,
				message: message.id,
				private: isPrivate,
				user
			} )
			.onDuplicateKeyUpdate( {
				set: { private: isPrivate, user }
			} )
	}

	public async remove( message: string ): Promise<void> {
		await this.container.drizzle.update( confessions )
			.set( { removed: true } )
			.where( eq( confessions.message, message ) )
	}
}

declare global {
	interface ModelRegistryEntries {
		'confessions': ConfessionsModel
	}
}
