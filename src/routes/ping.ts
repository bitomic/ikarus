import { type ApiRequest, type ApiResponse, methods, Route, type RouteOptions } from '@sapphire/plugin-api'
import { ApplyOptions } from '@sapphire/decorators'

@ApplyOptions<RouteOptions>( {
	enabled: true,
	route: 'ping'
	} )
export class UserRoute extends Route {
	public [ methods.GET ]( _: ApiRequest, response: ApiResponse ): void {
		response.json( { message: 'pong' } )
	}
}
