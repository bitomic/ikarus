import type { ModelStatic, Model as SequelizeModel } from 'sequelize'
import type { PieceContext, PieceOptions } from '@sapphire/pieces'
import { DataTypes } from 'sequelize'
import { Model } from '../framework'

interface IStarboardMessages {
	channel: string
	guild: string
	message: string
	pinChannel: string
	pinMessage: string
	thread?: string | undefined
	user: string
}

interface IStarboardMessagesInterface extends SequelizeModel<IStarboardMessages, IStarboardMessages>, IStarboardMessages {
}

export class StarboardMessagesModel extends Model<IStarboardMessagesInterface> {
	public readonly model: ModelStatic<IStarboardMessagesInterface>

	public constructor( context: PieceContext, options: PieceOptions ) {
		super( context, {
			...options,
			name: 'StarboardMessages'
		} )

		this.model = this.container.sequelize.define<IStarboardMessagesInterface>(
			'StarboardMessages',
			{
				channel: DataTypes.STRING,
				guild: DataTypes.STRING,
				message: {
					primaryKey: true,
					type: DataTypes.STRING
				},
				pinChannel: DataTypes.STRING,
				pinMessage: DataTypes.STRING,
				thread: {
					allowNull: true,
					type: DataTypes.STRING
				},
				user: DataTypes.STRING
			},
			{
				tableName: 'StarboardMessages',
				timestamps: false
			}
		)
	}

	protected key( guild: string, message: string ): string {
		return `starboard:${ guild }/${ message }`
	}

	public async has( guild: string, message: string ): Promise<string | null> {
		const key = this.key( guild, message )
		const cached = await this.container.redis.get( key )
		if ( cached ) return cached

		const result = await this.model.findOne( { where: { guild, message } } )
		if ( result ) {
			void this.container.redis.set( key, result.pinMessage )
		}

		return result?.pinMessage ?? null
	}

	public async set( options: IStarboardMessages ): Promise<void> {
		await this.model.create( options )
		const key = this.key( options.guild, options.message )
		void this.container.redis.set( key, options.pinMessage )
	}

	public async get( guild: string, message: string ): Promise<IStarboardMessages | null> {
		const result = await this.model.findOne( { where: { guild, message } } )
		return result
	}
}

declare global {
	interface ModelRegistryEntries {
		StarboardMessages: StarboardMessagesModel
	}
}
