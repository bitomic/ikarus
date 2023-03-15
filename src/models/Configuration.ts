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
		const result = ( await this.container.prisma.configuration.findUnique( {
			select: { value: true },
			where: {
				guild_property: { guild, property }
			}
		} ) )?.value
		if ( !result ) return null
		if ( validator ) {
			const value = validator.run( result )
			if ( value.isErr() ) return null
			return value.unwrap()
		}
		return result
	}
}

declare global {
	interface ModelRegistryEntries {
		configuration: ConfigurationModel
	}
}
