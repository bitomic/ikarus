import { Colors } from '@bitomic/material-colors'
import { EmbedBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ChannelType, Events, type GuildMember, type PartialGuildMember } from 'discord.js'

@ApplyOptions<ListenerOptions>( {
	event: Events.GuildMemberUpdate
} )
export class UserEvent extends Listener<typeof Events.GuildMemberUpdate> {
	public async run( oldMember: GuildMember | PartialGuildMember, newMember: GuildMember ) {
		const configuration = this.container.stores.get( 'models' ).get( 'configuration' )
		const twitchRole = await configuration.get( oldMember.guild.id, 'twitch-role' )
		if ( !twitchRole ) return

		const hadRole = oldMember.roles.resolve( twitchRole )
		const hasRole = newMember.roles.resolve( twitchRole )

		if ( hadRole?.id === hasRole?.id ) return

		const channelId = await configuration.get( oldMember.guild.id, 'twitch-channel' )
		if ( !channelId ) return

		const channel = await this.container.utilities.channel.getChannel( channelId, ChannelType.GuildText )
		const embed = new EmbedBuilder()
			.setAuthor( {
				iconURL: newMember.avatarURL( { extension: 'png' } ) ?? '',
				name: newMember.user.username
			} )
			.setColor( Colors.deepPurple.s800 )

		if ( hadRole ) {
			embed
				.setColor( Colors.amber.s800 )
				.setDescription( `<@!${ newMember.user.id }> ha perdido su estatus de suscriptor. ¡Esperamos verlo de nuevo por acá pronto!` )
			await channel.send( {
				embeds: [ embed ]
			} )
		} else {
			embed.setDescription( '¡Damos la bienvenida a otro suscriptor!' )
			await channel.send( {
				content: `<@!${ newMember.user.id }>`,
				embeds: [ embed ]
			} )
		}
	}
}
