import { container } from '@sapphire/pieces'
import { env } from './environment'
import Imgur from 'imgur'
import { type User } from 'discord.js'

class ImageManager {
	protected imgur = new Imgur( {
		clientId: env.IMGUR_CLIENT_ID,
		clientSecret: env.IMGUR_CLIENT_SECRET
	} )

	public async getUserAvatar( user: User | null ): Promise<string> {
		if ( !user ) return ''
		const url = user.avatarURL( { extension: 'png' } )
		if ( !url ) return ''
		const [ hash ] = url.split( /\//g ).pop()
			?.match( /^[0-9a-f]+/ ) ?? []
		if ( !hash ) return ''

		const avatarHashKey = `user-avatar-hash:${ user.id }`
		const avatarKey = `avatar:${ hash }`

		const storedHash = await container.redis.get( avatarHashKey )
		if ( storedHash === hash ) {
			const avatar = await container.redis.get( avatarKey )
			if ( avatar ) {
				return avatar
			}
		} else if ( storedHash ) {
			void container.redis.del( `avatar:${ storedHash }` )
		}

		const image = await this.imgur.upload( { image: url } )

		void container.redis.set( avatarHashKey, hash )
		void container.redis.set( avatarKey, image.data.link )

		return image.data.link
	}
}

container.images = new ImageManager()

declare module '@sapphire/pieces' {
	interface Container {
		images: ImageManager
	}
}
