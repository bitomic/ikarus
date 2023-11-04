import { env } from '#lib/environment'
import { Colors } from '@bitomic/material-colors'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { ButtonLimits, EmbedLimits, TextInputLimits } from '@sapphire/discord-utilities'
import { Time } from '@sapphire/duration'
import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { type APIButtonComponentWithCustomId, ApplicationCommandOptionType, ButtonStyle, ChannelType, type ChatInputCommandInteraction, ComponentType, type Message, PermissionFlagsBits, TextInputStyle } from 'discord.js'
import chunk from 'lodash/chunk.js'

@ApplyOptions<CommandOptions>( {
	name: 'notificaciones'
} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
			description: 'Configura el sistema de notificaciones de juego.',
			dmPermission: false,
			name: this.name,
			options: [
				{
					description: 'Crea un mensaje para añadir botones en él.',
					name: 'create-message',
					nameLocalizations: {
						'es-ES': 'crear-mensaje'
					},
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: 'Agrega un botón para enviar notificaciones.',
					name: 'add-button',
					nameLocalizations: {
						'es-ES': 'agregar-botón'
					},
					options: [
						{
							description: 'Texto del botón',
							maxLength: ButtonLimits.MaximumLabelCharacters,
							minLength: 1,
							name: 'label',
							nameLocalizations: {
								'es-ES': 'etiqueta'
							},
							required: true,
							type: ApplicationCommandOptionType.String
						},
						{
							description: 'Rol para mencionar.',
							name: 'role',
							nameLocalizations: {
								'es-ES': 'rol'
							},
							required: true,
							type: ApplicationCommandOptionType.Role
						}
					],
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: 'Elimina un botón para enviar notificaciones.',
					name: 'remove-button',
					nameLocalizations: {
						'es-ES': 'eliminar-botón'
					},
					options: [
						{
							description: 'Rol para retirar.',
							name: 'role',
							nameLocalizations: {
								'es-ES': 'rol'
							},
							required: true,
							type: ApplicationCommandOptionType.Role
						}
					],
					type: ApplicationCommandOptionType.Subcommand
				}
			]
		}, { guildIds: [ env.NODE_ENV === 'development' ? env.DISCORD_DEVELOPMENT_SERVER : '1091101890084884630' ] } )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const subcommand = s.enum( ...[ 'create-message', 'add-button', 'remove-button' ] as const )
			.parse( interaction.options.getSubcommand() )

		if ( subcommand === 'create-message' ) {
			await this.createMessage( interaction )
		} else if ( subcommand === 'add-button' ) {
			await this.addButton( interaction )
		} else {
			await this.removeButton( interaction )
		}
	}

	protected async createMessage( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const modal = new ModalBuilder()
			.setCustomId( 'notification-message' )
			.setTitle( 'Crear mensaje de notificaciones' )
			.addComponents(
				new ActionRowBuilder<TextInputBuilder>()
					.addComponents(
						new TextInputBuilder()
							.setCustomId( 'title' )
							.setLabel( 'Título' )
							.setMaxLength( EmbedLimits.MaximumTitleLength )
							.setMinLength( 1 )
							.setRequired( true )
							.setStyle( TextInputStyle.Short )
					),
				new ActionRowBuilder<TextInputBuilder>()
					.addComponents(
						new TextInputBuilder()
							.setCustomId( 'content' )
							.setLabel( 'Contenido' )
							.setMaxLength( TextInputLimits.MaximumValueCharacters )
							.setMinLength( 10 )
							.setRequired( true )
							.setStyle( TextInputStyle.Paragraph )
					)
			)

		await interaction.showModal( modal )
		const submit = await interaction.awaitModalSubmit( {
			filter: submit => submit.customId === 'notification-message',
			time: Time.Second * 15
		} )

		const title = submit.fields.getTextInputValue( 'title' )
		const content = submit.fields.getTextInputValue( 'content' )
		const embed = new EmbedBuilder()
			.setTitle( title )
			.setDescription( content )
			.setColor( Colors.deepOrange.s800 )

		const channel = await this.container.utilities.channel.getChannel( interaction.channelId, ChannelType.GuildText )
		const message = await channel.send( {
			embeds: [ embed ]
		} )
		await submit.reply( {
			content: 'El mensaje fue guardado exitosamente.',
			ephemeral: true
		} )

		await message.pin()
	}

	protected async addButton( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		const label = interaction.options.getString( 'label', true )
		const role = interaction.options.getRole( 'role', true )
		const message = await this.getInteractionMessage( interaction )
		if ( !message ) return

		const buttons = this.getButtons( message )

		const alreadyExists = buttons.find( button => button.custom_id.endsWith( role.id ) )
		if ( alreadyExists ) {
			await interaction.editReply( 'Ya hay un botón para este rol. Si quieres modificarlo, debes de eliminarlo primero.' )
			return
		}

		buttons.push( {
			custom_id: `notify-${ role.id }`,
			label,
			style: ButtonStyle.Secondary,
			type: ComponentType.Button
		} )

		await this.updateComponents( message, buttons )
		await interaction.editReply( 'Botón añadido exitosamente.' )
	}

	protected async removeButton( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		const role = interaction.options.getRole( 'role', true )
		const message = await this.getInteractionMessage( interaction )
		if ( !message ) return

		const buttons = this.getButtons( message )

		const updated = buttons.filter( button => !button.custom_id.endsWith( role.id ) )
		if ( buttons.length === updated.length ) {
			await interaction.editReply( 'No hay un botón registrado para este rol.' )
			return
		}

		await this.updateComponents( message, updated )
		await interaction.editReply( 'Botón eliminado exitosamente.' )
	}

	protected async getInteractionMessage( interaction: ChatInputCommandInteraction<'cached'> ): Promise<Message | null> {
		const channel = interaction.channel ?? await this.container.utilities.channel.getChannel( interaction.channelId, ChannelType.GuildText )
		const pinned = await channel.messages.fetchPinned()
		const message = pinned.first()

		if ( !message || message.author.id !== this.container.client.user?.id ) {
			await interaction.editReply( 'No he podido encontrar mensajes en el canal, o el más reciente no fue enviado por mí.' )
			return null
		}

		return message
	}

	protected getButtons( message: Message ): APIButtonComponentWithCustomId[] {
		const buttons = message.components
			.flatMap( row => row.components
				.filter( item => item.type === ComponentType.Button )
				.map( button => button.toJSON() as APIButtonComponentWithCustomId )
			)
		return buttons
	}

	protected async updateComponents( message: Message, buttons: APIButtonComponentWithCustomId[] ): Promise<void> {
		const rows = chunk( buttons, 5 )
			.map( row => new ActionRowBuilder<ButtonBuilder>().addComponents(
				row.map( button => new ButtonBuilder( button ) )
			) )
		await message.edit( {
			components: rows
		} )
	}
}
