import type { ModelStatic, Model as SequelizeModel } from 'sequelize'
import type { PieceContext, PieceOptions } from '@sapphire/pieces'
import { DataTypes } from 'sequelize'
import type { GuildSettingKey } from '../utils'
import { Model } from '../framework'

interface IGuildSettings {
	guild: string
	setting: GuildSettingKey
	value: string
}

interface IGuildSettingsInterface extends SequelizeModel<IGuildSettings, IGuildSettings>, IGuildSettings {
}

export class GuildSettingsModel extends Model<IGuildSettingsInterface> {
	public readonly model: ModelStatic<IGuildSettingsInterface>

	public constructor( context: PieceContext, options: PieceOptions ) {
		super( context, {
			...options,
			name: 'GuildSettings'
		} )

		this.model = this.container.sequelize.define<IGuildSettingsInterface>(
			'GuildSettings',
			{
				guild: {
					primaryKey: true,
					type: DataTypes.STRING
				},
				setting: {
					primaryKey: true,
					type: DataTypes.STRING
				},
				value: DataTypes.STRING
			},
			{
				tableName: 'GuildSettings',
				timestamps: false
			}
		)
	}

	protected key( guild: string, setting: GuildSettingKey ): string {
		return `guild-settings:${ guild }/${ setting }`
	}

	public async set( options: IGuildSettings ): Promise<void> {
		await this.model.upsert( options )
		const key = this.key( options.guild, options.setting )
		void this.container.redis.set( key, options.value )
	}

	public async get( guild: string, setting: GuildSettingKey ): Promise<string | null> {
		const key = this.key( guild, setting )
		const cached = await this.container.redis.get( key )
		console.log( { cached } )
		if ( cached ) return cached

		const result = await this.model.findOne( { where: { guild, setting } } )
		if ( result ) {
			console.log( [ result ] )
			void this.container.redis.set( key, result.value )
		}

		return result?.value ?? null
	}

	public async getGuildSettings( guild: string ): Promise<Record<string, string>> {
		const query = await this.model.findAll( { where: { guild } } )
		return query.reduce( ( settings, item ) => {
			settings[ item.setting ] = item.value
			return settings
		}, {} as Record<string, string> )
	}
}

declare global {
	interface ModelRegistryEntries {
		GuildSettings: GuildSettingsModel
	}
}
