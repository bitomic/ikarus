import { type ApiRequest, type ApiResponse, methods, Route, type RouteOptions } from '@sapphire/plugin-api'
import { ApplyOptions } from '@sapphire/decorators'

interface RequestParams extends Record<string, string> {
	channel: string
	guild: string
	message: string
}

@ApplyOptions<RouteOptions>( {
	enabled: true,
	route: 'guilds/:guild'
} )
export class UserRoute extends Route {
	public async [ methods.GET ]( request: ApiRequest, response: ApiResponse ): Promise<void> {
		const { guild } = request.params as RequestParams

		try {
			const g = await this.container.client.guilds.fetch( guild )
			response.json( g.toJSON() )
		} catch {
			response.json( {} )
		}
	}
}
