import { type ApiRequest, type ApiResponse, methods, Route, type RouteOptions } from '@sapphire/plugin-api'
import { ApplyOptions } from '@sapphire/decorators'
import { DiscordAPIError } from 'discord.js'

interface RequestParams extends Record<string, string> {
	channel: string
	guild: string
	message: string
}

@ApplyOptions<RouteOptions>( {
	enabled: true,
	route: 'messages/:guild/:channel/:message'
	} )
export class UserRoute extends Route {
	public async [ methods.GET ]( request: ApiRequest, response: ApiResponse ): Promise<void> {
		const { channel, guild, message } = request.params as RequestParams

		try {
			const g = await this.container.client.guilds.fetch( guild )
			const c = await g.channels.fetch( channel )
			if ( !c?.isText() ) {
				response.json( {
					error: `The channel must be a text channel. ${ c?.name ?? 'The channel' } is ${ c?.type ?? 'unknown type' }.`
				} )
				return
			}
			const m = await c.messages.fetch( message )
			if ( m.system ) {
				response.json( {
					error: 'You can\'t fetch a system message.'
				} )
				return
			}
			response.json( m.toJSON() )
		} catch ( e ) {
			if ( e instanceof DiscordAPIError ) {
				let error: string | null = null
				if ( e.message === 'Missing Access' ) {
					error = 'Couldn\'t access the guild that you specified.'
				} else if ( e.message === 'Unknown Channel' ) {
					error = 'Couldn\'t find the channel that you specified.'
				} else if ( e.message === 'Unknown Message' ) {
					error = 'Couldn\'t find the message that you specified.'
				}

				if ( error ) {
					response.json( { error } )
					return
				}
			}

			response.json( {
				error: 'There was an unknown error.'
			} )
		}
	}

	public async [ methods.POST ]( request: ApiRequest, response: ApiResponse ): Promise<void> {
		const { channel, guild, message } = request.params as RequestParams

		try {
			const g = await this.container.client.guilds.fetch( guild )
			const c = await g.channels.fetch( channel )
			if ( !c?.isText() ) {
				response.json( {
					error: `The channel must be a text channel. ${ c?.name ?? 'The channel' } is ${ c?.type ?? 'unknown type' }.`
				} )
				return
			}

			if ( message.match( /^\d+$/ ) ) {
				const m = await c.messages.fetch( message )
				const webhook = await m.fetchWebhook()
				await webhook.editMessage( m, request.body as string )
				response.json( {
					message: 'The message was updated successfully.'
				} )
				return
			}

			const webhook = ( await c.fetchWebhooks() ).find( i => i.owner?.id === this.container.client.id ) ?? await c.createWebhook( this.container.client.user?.username ?? 'Unknown', {
				avatar: this.container.client.user?.avatarURL( { format: 'png' } ) ?? ''
			} )
			await webhook.send( request.body as string )
			response.json( {
				message: 'The message was sent successfully.'
			} )
		} catch ( e ) {
			if ( e instanceof DiscordAPIError ) {
				let error: string | null = null
				if ( e.message === 'Missing Access' ) {
					error = 'Couldn\'t access the guild that you specified.'
				} else if ( e.message === 'Unknown Channel' ) {
					error = 'Couldn\'t find the channel that you specified.'
				} else if ( e.message === 'Unknown Message' ) {
					error = 'Couldn\'t find the message that you specified.'
				}

				if ( error ) {
					response.json( { error } )
					return
				}
			}

			response.json( {
				error: 'There was an unknown error.'
			} )
		}
	}
}
