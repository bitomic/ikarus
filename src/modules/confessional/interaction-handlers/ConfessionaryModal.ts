import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ButtonInteraction, ButtonStyle, ChannelType, type ModalSubmitInteraction, type TextChannel, ThreadAutoArchiveDuration, type ThreadChannel  } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders'
import { env } from '#lib/environment'
import { Colors } from '@bitomic/material-colors'

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
		const channel = await this.container.client.channels.fetch( channelId )
		if ( channel?.type !== ChannelType.GuildText ) {
			this.container.logger.warn( `Confessionary: Couldn't find channel with id ${ channelId }.` )
			await interaction.editReply( {
				content: 'Hubo un problema al intentar guardar tu anécdota. A continuación tienes el contenido que enviaste para poder reenviarlo.',
				embeds: [ {
					color: Colors.amber.s800,
					description: content
				} ]
			} )
			return
		}

		const thread = await this.findThread( channel )
		const embed = new EmbedBuilder( {
			color: Colors.deepPurple.s800,
			description: content
		} )
		const components = new ActionRowBuilder<ButtonBuilder>()
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

		const message = await thread.send( {
			components: [ components ],
			embeds: [ embed ]
		} )
		await this.container.prisma.confession.create( {
			data: {
				guild: interaction.guildId,
				message: message.id,
				user: interaction.user.id
			}
		} )
		await interaction.editReply( {
			content: 'Tu anécdota fue guardada exitosamente. A continuación tienes una copia temporal de tu mensaje.',
			embeds: [ {
				color: Colors.green.s800,
				description: content
			} ]
		} )
	}

	protected async findThread( channel: TextChannel ): Promise<ThreadChannel> {
		const name = 'Anécdotas'
		const { threads } = await channel.threads.fetch()
		const target = threads.find( i => i.name === name )
		if ( target ) return target

		return channel.threads.create( {
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
			invitable: false,
			name,
			type: ChannelType.PrivateThread
		} )
	}
}
