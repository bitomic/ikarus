import { ApplyOptions } from '@sapphire/decorators'
import { s } from '@sapphire/shapeshift'
import { SnowflakeRegex } from '@sapphire/discord-utilities'
import { Utility } from '@sapphire/plugin-utilities-store'

@ApplyOptions<Utility.Options>( {
	name: 'validation'
} )
export class ValidationUtility extends Utility {
	public readonly snowflake = s.string.regex( SnowflakeRegex )
}

declare module '@sapphire/plugin-utilities-store' {
	export interface Utilities {
		validation: ValidationUtility
	}
}
