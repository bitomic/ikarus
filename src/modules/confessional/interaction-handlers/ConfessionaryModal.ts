import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ButtonInteraction, ButtonStyle, ChannelType, type ModalSubmitInteraction  } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders'
import { env } from '#lib/environment'
import { Colors } from '@bitomic/material-colors'
import { confession } from 'src/drizzle/schema.js'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( interaction.customId === 'confessionary' ) return this.some()
		return this.none()
	}

	public async run( interaction: ModalSubmitInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )
		const content = interaction.fields.getTextInputValue( 'content' )
		const channelId = env.NODE_ENV === 'development' ? '1157397692058710066' : '1168408891814592512'
		const embed = this.createEmbed( content )

		try {
			const channel = await this.container.utilities.channel.getChannel( channelId, ChannelType.GuildText )

			const thread = await this.container.utilities.channel.findThreadByName( channel, 'Anécdotas', ChannelType.PrivateThread )

			const message = await thread.send( {
				components: [ this.createComponents() ],
				embeds: [ this.createEmbed( content ) ]
			} )
			await this.storeData( interaction.guildId, message.id, interaction.user.id )
			await interaction.editReply( {
				content: 'Tu anécdota fue guardada exitosamente. A continuación tienes una copia temporal de tu mensaje.',
				embeds: [ embed.setColor( Colors.green.s800 ) ]
			} )
		} catch ( e ) {
			this.container.logger.error( e )
			await interaction.editReply( {
				content: 'Hubo un problema al intentar guardar tu anécdota. A continuación tienes el contenido que enviaste para poder reenviarlo.',
				embeds: [ embed.setColor( Colors.amber.s800 ) ]
			} )
		}
	}

	protected createComponents(): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder( {
					custom_id: 'confession_approve',
					label: 'Confirmar revisión',
					style: ButtonStyle.Success
				} ),
				new ButtonBuilder( {
					custom_id: 'confession_decline',
					label: 'Rechazar anécdota',
					style: ButtonStyle.Danger
				} )
			)
	}

	protected createEmbed( description: string ): EmbedBuilder {
		return new EmbedBuilder( {
			color: Colors.deepPurple.s800,
			description
		} )
	}

	protected async storeData( guild: string, message: string, user: string ): Promise<void> {
		await this.container.drizzle.insert( confession )
			.values( { guild, message, user  } )
	}
}
