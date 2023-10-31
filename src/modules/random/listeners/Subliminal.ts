import { env } from '#lib/environment'
import { ApplyOptions } from '@sapphire/decorators'
import { FormattedCustomEmoji } from '@sapphire/discord-utilities'
import { Time } from '@sapphire/duration'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import { Events, type Message } from 'discord.js'

@ApplyOptions<ListenerOptions>( {
	event: Events.MessageCreate
} )
export class UserEvent extends Listener<typeof Events.MessageCreate> {
	public static readonly EMOJI = new RegExp( FormattedCustomEmoji, 'g' )
	public static readonly GUILD = env.NODE_ENV === 'development' ? env.DISCORD_DEVELOPMENT_SERVER : '1091101890084884630'
	public static readonly PATTERN = /b(.*)o([^r]+)r(.*)i/i

	public lastMessage = 0

	public async run( message: Message<boolean> ): Promise<void> {
		if ( message.guildId !== UserEvent.GUILD || message.author.bot ) return
		if ( message.content.length < 10 || !UserEvent.PATTERN.test( message.content ) ) return
		if ( Date.now() < this.lastMessage + Time.Minute * 15 ) return

		const highlight = message.content.toLowerCase().replace( UserEvent.PATTERN, '__B__$1__O__$2__R__$3__I__' )
			.replace( /_{4}/, '' )
		if ( !highlight.replace( UserEvent.EMOJI, '' ).match( UserEvent.PATTERN ) ) return

		await message.reply( {
			allowedMentions: {
				parse: []
			},
			content: highlight
		} )
		this.lastMessage = Date.now()
	}
}
