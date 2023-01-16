import { container } from '@sapphire/pieces'
import { env } from './environment'
import { request } from 'undici'

interface Stream {
	id: string
	game_id: string
	game_name: string
	is_mature: boolean
	language: string
	started_at: string
	tags: string[]
	thumbnail_url: string
	title: string
	user_id: string
	user_login: string
	user_name: string
	viewer_count: number
}

class Twitch {
	private accessToken = ''
	private tokenExpiry = 0

	public async init(): Promise<void> {
		const { redis } = container
		const token = await redis.get( 'twitch:access-token' )
		const expiry = await redis.get( 'twitch:token-expiry' )
		if ( !token || !expiry ) {
			await this.refreshToken()
			return
		}

		this.accessToken = token
		this.tokenExpiry = parseInt( expiry, 10 )
	}

	private async availableToken(): Promise<void> {
		if ( Date.now() <= this.tokenExpiry ) return
		await this.refreshToken()
	}

	private async refreshToken(): Promise<void> {
		const now = Date.now()
		const { body } = await request( 'https://id.twitch.tv/oauth2/token', {
			body: `client_id=${ env.TWITCH_CLIENT }&client_secret=${ env.TWITCH_SECRET }&grant_type=client_credentials`,
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			},
			method: 'POST'
		} )
		const res = await body.json() as {
			access_token: string
			expires_in: number
			token_type: string
		}

		this.accessToken = res.access_token
		this.tokenExpiry = now + res.expires_in * 1000

		const { redis } = container
		await redis.set( 'twitch:access-token', this.accessToken )
		await redis.set( 'twitch:token-expiry', this.tokenExpiry )
	}

	public async get( url: string, query: Record<string, string | number | string[] | number[]> ): Promise<unknown> {
		await this.availableToken()

		const params = Object.entries( query ).map( ( [ key, value ] ) => {
			if ( typeof value === 'string' || typeof value === 'number' ) return `${ key }=${ value }`
			return value.map( v => `${ key }=${ v }` ).join( '&' )
		} )
			.join( '&' )
		const { body } = await request( `${ url }?${ params }`, {
			headers: {
				'Client-Id': env.TWITCH_CLIENT,
				authorization: `Bearer ${ this.accessToken }`,
				'content-type': 'application/x-www-form-urlencoded'
			}
		} )
		return body.json()
	}

	public async getUserStream( user: string ): Promise<Stream | null> {
		const req = await this.get( 'https://api.twitch.tv/helix/streams', {
			user_login: user
		} ) as { data: Stream[] }
		return req.data.at( 0 ) ?? null
	}
}

container.twitch = new Twitch()

declare module '@sapphire/pieces' {
	interface Container {
		twitch: Twitch
	}
}
