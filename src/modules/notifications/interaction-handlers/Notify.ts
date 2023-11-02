import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { ButtonInteraction  } from 'discord.js'
import { time, TimestampStyles } from '@discordjs/builders'
import { s } from '@sapphire/shapeshift'
import { Time } from '@sapphire/duration'
import { Colors } from '@bitomic/material-colors'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( interaction.customId.startsWith( 'notify-' ) ) return this.some()
		return this.none()
	}

	public async run( interaction: ButtonInteraction<'cached'> ): Promise<void> {
		const roleId = s.string.parse( interaction.customId.split( '-' ).at( 1 ) )
		const role = interaction.member.roles.resolve( roleId )

		if ( !role ) {
			await interaction.reply( {
				content: `No puedes enviar una notificación para <@&${ roleId }> porque no tienes este rol. Intenta asignártelo primero en <id:browse>.`,
				ephemeral: true
			} )
			return
		}

		const key = `notify:${ roleId }`
		const stored = parseInt( await this.container.redis.get( key ) ?? '0', 10 )
		if ( Date.now() < stored + Time.Hour ) {
			const timestamp = time( Math.floor( stored / 1000 ), TimestampStyles.RelativeTime  )
			const expiry = time( Math.floor( ( stored + Time.Hour ) / 1000 ), TimestampStyles.RelativeTime )
			await interaction.reply( {
				content: `No puedes enviar una notificación para <@&${ roleId }> porque ya se envió un mensaje ${ timestamp }. Podrás enviar una nueva notificación para este rol ${ expiry }.`,
				ephemeral: true
			} )
			return
		}

		await interaction.reply( {
			content: `¡<@!${ interaction.user.id }> (${ interaction.user.username }) está buscando a gente para jugar <@&${ roleId }>!`,
			embeds: [ {
				color: role.color || Colors.deepOrange.s800,
				description: '¿No quieres recibir menciones de este tipo? Puedes modificar tus roles en <id:browse>.'
			} ]
		} )
		const message = await interaction.fetchReply()

		await this.container.redis.set( key, Date.now() )
		await this.container.tasks.create( 'remove-notification', {
			channel: interaction.channelId,
			message: message.id
		}, Time.Hour )
	}
}
