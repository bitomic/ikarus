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
		if ( interaction.inGuild() && interaction.channel && interaction.guild ) {
			this.LOG.write( `${ interaction.user.username } (${ interaction.user.id }) used ${ interaction.commandName } in #${ interaction.channel.name } (${ interaction.channel.id }) from guild ${ interaction.guild.name } (${ interaction.guildId })` )
		} else {
			this.LOG.write( `${ interaction.user.username } (${ interaction.user.id }) used ${ interaction.commandName } in their DM` )
		}
	}
}
