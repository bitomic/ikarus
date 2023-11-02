import { ApplyOptions } from '@sapphire/decorators'
import { Events, Listener, type ListenerOptions } from '@sapphire/framework'
import type { ChatInputCommandInteraction } from 'discord.js'
import fs from 'fs'

@ApplyOptions<ListenerOptions>( {
	event: Events.ChatInputCommandFinish
} )
export class UserEvent extends Listener<typeof Events.ChatInputCommandFinish> {
	public readonly LOG = fs.createWriteStream( 'commands.log', { flags: 'a' } )

	public run( interaction: ChatInputCommandInteraction ): void {
		const notifier = this.container.notifier.for( 'core' )

		if ( interaction.inGuild() && interaction.channel && interaction.guild ) {
			const message = `Command used: ${ interaction.commandName }.`
			void notifier.log( message, {
				channel: interaction.channelId,
				guild: interaction.guildId,
				user: interaction.user.id
			} )
		} else {
			const message = `${ interaction.user.username } (${ interaction.user.id }) used ${ interaction.commandName } in their DM.`
			void notifier.log( message )
		}
	}
}
