import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ButtonInteraction, ButtonStyle  } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, time, TimestampStyles } from '@discordjs/builders'
import { s } from '@sapphire/shapeshift'
import { Time } from '@sapphire/duration'
import { Colors } from '@bitomic/material-colors'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( !interaction.customId.startsWith( 'notify-' ) ) return this.none()

		const roleId = s.string.parse( interaction.customId.split( '-' ).at( 1 ) )
		return this.some( { roleId } )
	}

	public async run( interaction: ButtonInteraction<'cached'>, { roleId }: InteractionHandler.ParseResult<this> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )
		const role = interaction.member.roles.resolve( roleId )

		if ( !role ) {
			await interaction.editReply( {
				content: `No puedes enviar una notificación para <@&${ roleId }> porque no tienes este rol. Intenta asignártelo primero en <id:browse>.`
			} )
			return
		}

		const key = `notify:${ roleId }`
		const stored = parseInt( await this.container.redis.get( key ) ?? '0', 10 )
		if ( Date.now() < stored + Time.Hour ) {
			const timestamp = time( Math.floor( stored / 1000 ), TimestampStyles.RelativeTime  )
			const expiry = time( Math.floor( ( stored + Time.Hour ) / 1000 ), TimestampStyles.RelativeTime )
			await interaction.editReply( {
				content: `No puedes enviar una notificación para <@&${ roleId }> porque ya se envió un mensaje ${ timestamp }. Podrás enviar una nueva notificación para este rol ${ expiry }.`
			} )
			return
		}

		const channel = await this.container.stores.get( 'models' ).get( 'notifications' )
			.getChannel( interaction.guildId, roleId )

		const message = await channel.send( {
			content: `¡<@!${ interaction.user.id }> (${ interaction.user.username }) está buscando a gente para jugar <@&${ roleId }>!`,
			embeds: [ {
				color: role.color || Colors.deepOrange.s800,
				description: '¿No quieres recibir menciones de este tipo? Puedes modificar tus roles en <id:customize>.'
			} ]
		} )
		await this.container.redis.set( key, Date.now() )

		await interaction.editReply( {
			components: [
				new ActionRowBuilder<ButtonBuilder>()
					.addComponents( new ButtonBuilder( {
						label: 'Ir al mensaje',
						style: ButtonStyle.Link,
						url: message.url
					} ) )
			],
			content: 'Se ha enviado la notificación exitosamente. ¡Suerte en tus partidas!'
		} )
	}
}
