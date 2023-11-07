import { ApplyOptions } from '@sapphire/decorators'
import { Model } from '#framework/Model'
import { type PieceOptions } from '@sapphire/framework'
import { configuration } from '#drizzle/schema'
import { and, eq } from 'drizzle-orm'

@ApplyOptions<PieceOptions>( {
	name: 'configuration'
} )
export class ConfigurationModel extends Model {
	public async get( guild: string, property: string ): Promise<string | null> {
		const cached = await this.container.redis.get( `config:${ guild }/${ property }` )
		if ( cached ) return cached

		const [ stored ] = await this.container.drizzle.select()
			.from( configuration )
			.where( and(
				eq( configuration.guild, guild ),
				eq( configuration.property, property )
			) )
			.limit( 1 )

		if ( !stored ) return null

		await this.container.redis.set( `config:${ guild }/${ property }`, stored.value )
		return stored.value
	}

	public async set( guild: string, property: string, value: string ): Promise<void> {
		await this.container.drizzle.insert( configuration )
			.values( { guild, property, value } )
			.onDuplicateKeyUpdate( {
				set: {
					value
				}
			} )
		await this.container.redis.set( `config:${ guild }/${ property }`, value )
	}
}

declare global {
	interface ModelRegistryEntries {
		configuration: ConfigurationModel
	}
}
