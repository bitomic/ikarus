import { type ApiRequest, type ApiResponse, methods, Route, type RouteOptions } from '@sapphire/plugin-api'
import { ApplyOptions } from '@sapphire/decorators'

interface RequestParams extends Record<string, string> {
	guild: string
}

@ApplyOptions<RouteOptions>( {
	enabled: true,
	route: 'roles/:guild'
} )
export class UserRoute extends Route {
	public async [ methods.GET ]( request: ApiRequest, response: ApiResponse ): Promise<void> {
		const { guild } = request.params as RequestParams

		try {
			const g = await this.container.client.guilds.fetch( guild )
			response.json( await g.roles.fetch() )
		} catch {
			response.json( {} )
		}
	}
}
