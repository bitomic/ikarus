import { i18n } from '#decorators/i18n'
import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { ButtonLimits } from '@sapphire/discord-utilities'
import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { type APIButtonComponentWithCustomId, ApplicationCommandOptionType, ButtonStyle, ChannelType, type ChatInputCommandInteraction, ComponentType, type Message, PermissionFlagsBits } from 'discord.js'
import chunk from 'lodash/chunk.js'

@ApplyOptions<CommandOptions>( {
	name: 'notifications'
} )
export class UserCommand extends Command {
	@i18n
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
			description: 'Configura el sistema de notificaciones de juego.',
			dmPermission: false,
			name: this.name,
			options: [
				{
					description: '',
					name: 'add-button',
					options: [
						{
							channelTypes: [
								ChannelType.GuildText
							],
							description: '',
							name: 'channel',
							required: true,
							type: ApplicationCommandOptionType.Channel
						},
						{
							description: '',
							maxLength: ButtonLimits.MaximumLabelCharacters,
							minLength: 1,
							name: 'label',
							required: true,
							type: ApplicationCommandOptionType.String
						},
						{
							description: '',
							name: 'role',
							required: true,
							type: ApplicationCommandOptionType.Role
						},
						{
							description: '',
							name: 'message',
							type: ApplicationCommandOptionType.String
						}
					],
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'remove-button',
					options: [
						{
							description: '',
							name: 'role',
							required: true,
							type: ApplicationCommandOptionType.Role
						}
					],
					type: ApplicationCommandOptionType.Subcommand
				}
			]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const subcommand = s.enum( ...[ 'add-button', 'remove-button' ] as const )
			.parse( interaction.options.getSubcommand() )

		if ( subcommand === 'add-button' ) {
			await this.addButton( interaction )
		} else {
			await this.removeButton( interaction )
		}
	}

	protected async addButton( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		const channel = interaction.options.getChannel( 'channel', true, [ ChannelType.GuildText ] )
		const label = interaction.options.getString( 'label', true )
		const role = interaction.options.getRole( 'role', true )
		const message = await this.container.utilities.interaction.getCustomizableMessage( interaction )

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
		await this.container.stores.get( 'models' ).get( 'notifications' )
			.setChannelForRole( interaction.guildId, channel.id, role.id )
		await interaction.editReply( 'Botón añadido exitosamente.' )
	}

	protected async removeButton( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		const role = interaction.options.getRole( 'role', true )
		const message = await this.container.utilities.interaction.getCustomizableMessage( interaction )

		const buttons = this.getButtons( message )

		const updated = buttons.filter( button => !button.custom_id.endsWith( role.id ) )
		if ( buttons.length === updated.length ) {
			await interaction.editReply( 'No hay un botón registrado para este rol.' )
			return
		}

		await this.updateComponents( message, updated )
		await this.container.stores.get( 'models' ).get( 'notifications' )
			.remove( role.id )
		await interaction.editReply( 'Botón eliminado exitosamente.' )
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
