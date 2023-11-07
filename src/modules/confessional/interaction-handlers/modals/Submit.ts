import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ButtonInteraction, ButtonStyle, type ModalSubmitInteraction, PermissionFlagsBits, type User } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders'
import { Colors } from '@bitomic/material-colors'
import { s } from '@sapphire/shapeshift'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
	name: 'confession-submit-modal'
} )
export class UserButton extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		if ( !interaction.customId.startsWith( 'confession' ) ) return this.none()

		const parsed = s.enum( ...[ 'private', 'public' ] as const ).run( interaction.customId.split( '-' ).at( 1 ) )
		if ( parsed.isErr() ) return this.none()

		return this.some( {
			type: parsed.unwrap()
		} )
	}

	public async run( interaction: ModalSubmitInteraction<'cached'>, { type }: InteractionHandler.ParseResult<this> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		const content = interaction.fields.getTextInputValue( 'content' )
		const channel = await this.container.stores.get( 'models' ).get( 'channel-settings' )
			.getChannel( interaction.guildId, 'confessional' )
			.catch( () => null )

		if ( !channel?.isTextBased() || channel.isVoiceBased() ) {
			await interaction.editReply( {
				content: 'Hay un problema con el canal donde se publican los mensajes.'
			} )
			return
		}

		const permissions = channel.permissionsFor( interaction.client.user )
		const hasPermissions = channel.isThread() ? permissions?.has( PermissionFlagsBits.SendMessagesInThreads ) : permissions?.has( PermissionFlagsBits.SendMessages )
		if ( !hasPermissions ) {
			await interaction.editReply( {
				content: 'No tengo permisos para enviar mensajes en el canal donde se publican los mensajse. Por favor, contacta con un administrador del servidor.'
			} )
			return
		}

		const embed = this.createEmbed( content, type === 'public' ? interaction.user : null )
		try {
			const message = await channel.send( {
				components: [ this.createComponents() ],
				embeds: [ this.createEmbed( content ) ]
			} )
			await this.container.stores.get( 'models' ).get( 'confessions' )
				.create( message, interaction.user.id, type === 'private' )
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
					custom_id: 'creview-approve',
					label: 'Confirmar revisión',
					style: ButtonStyle.Success
				} ),
				new ButtonBuilder( {
					custom_id: 'creview-decline',
					label: 'Rechazar',
					style: ButtonStyle.Danger
				} )
			)
	}

	protected createEmbed( description: string, user?: User | null ): EmbedBuilder {
		const embed = new EmbedBuilder( {
			color: Colors.deepPurple.s800,
			description,
			title: 'Confesión'
		} )

		if ( user ) {
			embed.setAuthor( {
				iconURL: user.avatarURL( { extension: 'png' } ) || '',
				name: user.username
			} )
		}

		return embed
	}
}
