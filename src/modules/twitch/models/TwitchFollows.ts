import { ApplyOptions } from '@sapphire/decorators'
import { Model } from '#framework/Model'
import type { PieceOptions } from '@sapphire/framework'
import type { TwitchFollows } from '@prisma/client'

@ApplyOptions<PieceOptions>( {
	name: 'twitchfollows'
} )
export class TwitchFollowsModel extends Model {
	public async getStreamers(): Promise<string[]> {
		const query = await this.container.prisma.twitchFollows.groupBy( {
			by: [ 'user' ]
		} )
		return query.map( i => i.user )
	}

	public async getStreamerTargets( user: string ): Promise<TwitchFollows[]> {
		const query = await this.container.prisma.twitchFollows.findMany( {
			where: { user }
		} )
		return query
	}
}

declare global {
	interface ModelRegistryEntries {
		twitchfollows: TwitchFollowsModel
	}
}
