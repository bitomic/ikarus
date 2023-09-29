import get from 'lodash/get.js'
import has from 'lodash/has.js'
import set from 'lodash/set.js'
import { resolveKey, type Target } from '@sapphire/plugin-i18next'
import { type APIEmbed, ChatInputCommandInteraction } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Utility } from '@sapphire/plugin-utilities-store'

@ApplyOptions<Utility.Options>( {
	name: 'embed'
} )
export class EmbedUtility extends Utility {
	public async i18n( target: Target, embed: APIEmbed, replace?: Record<string, unknown> | null, reply?: boolean ): Promise<APIEmbed> {
		const namespaces = [ ...this.container.i18n.namespaces ].join( '|' )
		const regex = new RegExp( `^${ namespaces }:` )

		const data = structuredClone( embed )
		const properties = [ 'author.name', 'description', 'footer.text', 'title' ]
		for ( const property of properties ) {
			if ( !has( data, property ) ) continue
			const value = get( data, property ) as unknown
			if ( typeof value !== 'string' || !value.match( regex ) ) continue
			const text = await resolveKey( target, value, { replace } )
			set( data, property, text )
		}

		if ( data.fields ) {
			for ( const field of data.fields ) {
				if ( field.name.match( regex ) ) {
					field.name = await resolveKey( target, field.name, { replace } )
				}
				if ( field.value.match( regex ) ) {
					field.value = await resolveKey( target, field.value, { replace } )
				}
			}
		}

		if ( reply ) {
			if ( target instanceof ChatInputCommandInteraction ) {
				const method = target.replied ? 'editReply' : 'reply'
				await target[ method ]( { embeds: [ data ] } )
			}
		}

		return data
	}
}

declare module '@sapphire/plugin-utilities-store' {
	export interface Utilities {
		embed: EmbedUtility
	}
}
