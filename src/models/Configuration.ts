import { ApplyOptions } from '@sapphire/decorators'
import type { BaseValidator } from '@sapphire/shapeshift'
import type { ConfigurationKey } from '@prisma/client'
import { Model } from '../framework'
import type { PieceOptions } from '@sapphire/framework'

@ApplyOptions<PieceOptions>( {
	name: 'configuration'
} )
export class ConfigurationModel extends Model {
	public get( guild: string, property: ConfigurationKey, validator?: undefined ): Promise<string | null>
	public get<T>( guild: string, property: ConfigurationKey, validator: BaseValidator<T> ): Promise<T | null>
	public async get<T>( guild: string, property: ConfigurationKey, validator?: BaseValidator<T> ): Promise<T | string | null> {
		const result = await this.getFromCache( guild, property )
		if ( !result ) return null
		if ( validator ) {
			const value = validator.run( result )
			if ( value.isErr() ) return null
			return value.unwrap()
		}
		return result
	}

	protected async getFromCache( guild: string, property: ConfigurationKey ): Promise<string | null> {
		const key = `configuration:${ guild }/${ property }`
		const cached = await this.container.redis.get( key )
		if ( cached ) return cached

		const stored = await this.getFromDatabase( guild, property )
		if ( !stored ) return null

		await this.container.redis.set( key, stored )
		return stored
	}

	protected async getFromDatabase( guild: string, property: ConfigurationKey ): Promise<string | null> {
		const result = await this.container.prisma.configuration.findUnique( {
			select: { value: true },
			where: {
				guild_property: { guild, property }
			}
		} )

		return result?.value ?? null
	}
}

declare global {
	interface ModelRegistryEntries {
		configuration: ConfigurationModel
	}
}
