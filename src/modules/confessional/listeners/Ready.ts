import { env } from '#lib/environment'
import { Colors } from '@bitomic/material-colors'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ButtonStyle, ChannelType, Events } from 'discord.js'

@ApplyOptions<ListenerOptions>( {
	event: Events.ClientReady,
	name: 'ConfessionalReady',
	once: true
} )
export class UserEvent extends Listener {
	public async run(): Promise<void> {
		const channelId = env.NODE_ENV === 'development' ? '1157397692058710066' : '1168408891814592512'
		const channel = await this.container.client.channels.fetch( channelId )
		if ( channel?.type !== ChannelType.GuildText ) {
			this.container.logger.warn( `Confessionary: Couldn't find channel with id ${ channelId }.` )
			return
		}

		await channel.messages.fetch( { limit: 1 } )
		if ( channel.lastMessage?.author.id === this.container.client.user?.id ) return

		const embed = new EmbedBuilder()
			.setTitle( 'Anecdotario Galáctico' )
			.setDescription( [
				'¡Bienvenido al Anecdotario Galáctico! Este es un espacio seguro para compartir tus anécdotas sin revelar tu identidad. Presiona el botón para enviar tus historias, las cuales pueden ser leídas en nuestros directos de Twitch.',
				'Valoramos tu privacidad y la confidencialidad de tus anécdotas. Tomamos en serio la anonimidad, pero si fuera necesario, es posible solicitar consultar de forma privada la identidad del remitente de una historia en particular. Por ejemplo, si surge una preocupación sobre la seguridad o se requiere aclarar un problema relevante.',
				'Queremos que te sientas seguro aquí para expresarte libremente. Tu privacidad es una prioridad, pero tu bienestar también lo es. ¡Adelante y comparte tus pensamientos de manera segura!'
			].join( '\n\n' ) )
			.setColor( Colors.deepPurple.s800 )
		const components = new ActionRowBuilder<ButtonBuilder>()
			.addComponents( new ButtonBuilder( {
				custom_id: 'confessionary',
				label: 'Enviar anécdota',
				style: ButtonStyle.Primary
			} ) )

		await channel.send( {
			components: [ components ],
			embeds: [ embed ]
		} )
	}
}
