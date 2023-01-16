import type { ModelStatic, Model as SequelizeModel } from 'sequelize'
import type { PieceContext, PieceOptions } from '@sapphire/pieces'
import { DataTypes } from 'sequelize'
import { Model } from '../framework'

interface ITwitchFollows {
	channel: string
	guild: string
	user: string
}

interface ITwitchFollowsInterface extends SequelizeModel<ITwitchFollows, ITwitchFollows>, ITwitchFollows {
}

export class TwitchFollowsModel extends Model<ITwitchFollowsInterface> {
	public readonly model: ModelStatic<ITwitchFollowsInterface>

	public constructor( context: PieceContext, options: PieceOptions ) {
		super( context, {
			...options,
			name: 'TwitchFollows'
		} )

		this.model = this.container.sequelize.define<ITwitchFollowsInterface>(
			'TwitchFollows',
			{
				channel: DataTypes.STRING,
				guild: {
					primaryKey: true,
					type: DataTypes.STRING
				},
				user: {
					primaryKey: true,
					type: DataTypes.STRING
				}
			},
			{
				tableName: 'TwitchFollows',
				timestamps: false
			}
		)
	}

	public async getStreamers(): Promise<string[]> {
		const query = await this.model.findAll( {
			attributes: [ 'user' ],
			group: 'user'
		} )
		return query.map( i => i.user )
	}

	public async getStreamerTargets( user: string ): Promise<Array<{ channel: string, guild: string }>> {
		const query = await this.model.findAll( {
			where: { user }
		} )
		return query.map( i => ( { channel: i.channel, guild: i.guild } ) )
	}

	public async register( options: ITwitchFollows ): Promise<void> {
		await this.model.upsert( options )
	}
}

declare global {
	interface ModelRegistryEntries {
		TwitchFollows: TwitchFollowsModel
	}
}
