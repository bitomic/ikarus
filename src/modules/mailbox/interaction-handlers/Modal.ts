import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ButtonInteraction, ChannelType, type ModalSubmitInteraction, type TextChannel } from 'discord.js'
import { EmbedBuilder, hyperlink } from '@discordjs/builders'
import { Colors } from '@bitomic/material-colors'
import { s } from '@sapphire/shapeshift'
import { env } from '#lib/environment'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
	name: 'mailbox-submit'
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( !interaction.customId.startsWith( 'mailbox' ) ) return this.none()

		const parsed = s.enum( ...[ 'clip', 'story' ] as const ).run( interaction.customId.split( '-' ).at( 1 ) )
		if ( parsed.isErr() ) return this.none()

		return this.some( {
			type: parsed.unwrap()
		} )
	}

	public async run( interaction: ModalSubmitInteraction<'cached'>, { type }: InteractionHandler.ParseResult<this> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		const content = interaction.fields.getTextInputValue( type )

		try {
			const { utilities } = this.container
			const channel = env.NODE_ENV === 'development'
				? await utilities.interaction.getInteractionChannel( interaction )
				: await utilities.channel.getChannel( '1186195533375750194', ChannelType.GuildText )
			const threadName = type === 'clip' ? 'Clips' : 'Historias'
			const thread = await utilities.channel.findThreadByName( channel as TextChannel, threadName, ChannelType.PrivateThread )

			const embed = new EmbedBuilder()
				.setAuthor( {
					iconURL: interaction.user.avatarURL( { extension: 'png' } ) ?? '',
					name: interaction.user.username
				} )
				.setColor( type === 'clip' ? Colors.deepPurple.s800 : Colors.indigo.s800 )

			if ( type === 'clip' ) {
				const { redis } = this.container
				const url = new URL( content )

				if ( url.host !== 'clips.twitch.tv' ) {
					await interaction.editReply( `El enlace que proporcionaste no parece ser un enlace de Twitch. Solo se permiten enlaces a clips de Twitch.\n${ url.href }` )
					return
				}

				const id = url.pathname.substring( 1 )
				const stored = await redis.sismember( `twitch-clips:${ id }`, interaction.user.id )

				if ( stored ) {
					await interaction.editReply( 'Ya habías votado por este clip, por lo que no puedes registrarlo nuevamente.' )
					return
				}

				const link = hyperlink( id, url )
				embed.setDescription( `<@!${ interaction.user.id }> (${ interaction.user.username }) acaba de añadir un voto para **${ link }**.` )
			} else {
				embed.setDescription( content )
			}

			await thread.send( { embeds: [ embed ] } )

			const msg = type === 'clip'
				? `<@!${ interaction.user.id }> votó por un clip.`
				: `<@!${ interaction.user.id }> envió una historia.`
			await channel.send( {
				embeds: [
					new EmbedBuilder()
						.setAuthor( {
							iconURL: interaction.user.avatarURL( { extension: 'png' } ) ?? '',
							name: interaction.user.username
						} )
						.setColor( interaction.member.displayColor || Colors.deepPurple.s800 )
						.setDescription( msg )
				]
			} )
			await interaction.editReply( 'Se ha registrado tu respuesta exitosamente. ¡Lo veremos el próximo viernes!' )
		} catch ( e ) {
			this.container.logger.error( e, content )
			await interaction.editReply( 'Hubo un problema al intentar guardar tu respuesta. Si el problema persiste, puedes mencionar a <@!697553237867364362>.' )
		}
	}
}
