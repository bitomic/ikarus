import { type ApiRequest, type ApiResponse, methods, Route, type RouteOptions } from '@sapphire/plugin-api'
import { ApplyOptions } from '@sapphire/decorators'
import { s } from '@sapphire/shapeshift'

@ApplyOptions<RouteOptions>( {
	enabled: true,
	route: 'twitch'
} )
export class UserRoute extends Route {
	public async [ methods.GET ]( request: ApiRequest, response: ApiResponse ): Promise<void> {
		const query = request.query as { guild?: string }
		if ( !query.guild ) {
			response.json( {
				error: 'You didn\'t specify a guild.'
			} )
			return
		}

		try {
			const streamers = await this.container.stores.get( 'models' ).get( 'TwitchFollows' )
				.getGuildStreamers( query.guild )
			response.json( streamers )
		} catch ( e ) {
			response.json( {
				error: 'There was an unknown error.'
			} )
		}
	}

	public async [ methods.POST ]( request: ApiRequest, response: ApiResponse ): Promise<void> {
		const { body } = request
		const schema = s.object( {
			action: s.enum( 'add', 'remove' ).optional,
			channel: s.string,
			guild: s.string,
			user: s.string
		} )

		try {
			const data = schema.parse( body )
			const { channel, guild, user } = data
			const models = this.container.stores.get( 'models' )
			const twitchFollows = models.get( 'TwitchFollows' )

			if ( data.action === 'remove' ) {
				await twitchFollows.remove( {
					guild, user
				} )
			} else {
				await twitchFollows.register( {
					channel, guild, user
				} )
			}
			response.json( {
				success: 'Successful operation.'
			} )
		} catch ( e ) {
			this.container.logger.error( 'There was an error while POSTing to the twitch route.' )
			this.container.logger.error( e )
			response.json( {
				error: 'There was an error with your request.'
			} )
		}
	}
}
