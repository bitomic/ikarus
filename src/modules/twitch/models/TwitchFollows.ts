import { ApplyOptions } from '@sapphire/decorators'
import { Model } from '#framework/Model'
import type { PieceOptions } from '@sapphire/framework'
import { twitchFollows } from 'src/drizzle/schema.js'
import { eq } from 'drizzle-orm'

@ApplyOptions<PieceOptions>( {
	name: 'twitchfollows'
} )
export class TwitchFollowsModel extends Model {
	public async getStreamers(): Promise<string[]> {
		const query = await this.container.drizzle.select()
			.from( twitchFollows )
			.groupBy( columns => columns.user )

		return query.map( i => i.user )
	}

	public async getStreamerTargets( user: string ): Promise<Array<typeof twitchFollows.$inferSelect>> {
		const query = await this.container.drizzle.select()
			.from( twitchFollows )
			.where( eq( twitchFollows.user, user ) )

		return query
	}
}

declare global {
	interface ModelRegistryEntries {
		twitchfollows: TwitchFollowsModel
	}
}
