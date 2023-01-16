import { type ApiRequest, type ApiResponse, methods, Route, type RouteOptions } from '@sapphire/plugin-api'
import { ApplyOptions } from '@sapphire/decorators'
import type { GuildSettingKey } from '../utils'
import { GuildSettings } from '../utils'

@ApplyOptions<RouteOptions>( {
	enabled: true,
	route: 'settings/:guild'
} )
export class UserRoute extends Route {
	public async [ methods.GET ]( request: ApiRequest, response: ApiResponse ): Promise<void> {
		const { params } = request

		try {
			const { guild } = params
			if ( !guild ) {
				response.json( {
					error: 'You didn\'t specify a guild.'
				} )
				return
			}

			const model = this.container.stores.get( 'models' ).get( 'GuildSettings' )
			const settings = await model.getGuildSettings( guild )
			response.json( settings )
		} catch ( e ) {
			response.json( {
				error: 'There was an unknown error.'
			} )
		}
	}

	public async [ methods.POST ]( request: ApiRequest, response: ApiResponse ): Promise<void> {
		const params = request.params as { guild: string }

		const settings = request.body as Record<string, unknown>
		const allowedKeys = Object.keys( settings ).filter( key => {
			try {
				GuildSettings.parse( key )
				return true
			} catch {
				return false
			}
		} )

		const model = this.container.stores.get( 'models' ).get( 'GuildSettings' )
		for ( const key of allowedKeys ) {
			const value = settings[ key ]
			if ( typeof value !== 'string' ) continue
			await model.set( {
				guild: params.guild,
				setting: key as GuildSettingKey,
				value
			} )
		}

		response.json( allowedKeys.reduce( ( list, key ) => {
			const value = settings[ key ]
			if ( typeof value === 'string' ) {
				list[ key ] = settings[ key ]
			}
			return list
		}, {} as Record<string, unknown> ) )
	}
}
