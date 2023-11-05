import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { ApplicationCommandOptionType, ButtonStyle, type ChatInputCommandInteraction, type InteractionReplyOptions, type Message, PermissionFlagsBits } from 'discord.js'
import { i18n } from '#decorators/i18n'
import { s } from '@sapphire/shapeshift'
import { MessageLinkRegex, SnowflakeRegex } from '@sapphire/discord-utilities'
import { MissingMessageError } from '../../../errors/MissingMessage.js'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder } from '@discordjs/builders'
import { Colors } from '@bitomic/material-colors'

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'message'
} )
export class UserCommand extends Command {
	@i18n
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
			description: this.description,
			dmPermission: false,
			name: this.name,
			options: [
				{
					description: '',
					name: 'create',
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'edit',
					options: [ {
						description: '',
						name: 'message',
						type: ApplicationCommandOptionType.String
					} ],
					type: ApplicationCommandOptionType.Subcommand
				}
			]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const subcommand = s.enum( ...[ 'create', 'edit' ] as const ).parse( interaction.options.getSubcommand() )

		if ( subcommand === 'create' ) {
			await this.handleCreate( interaction )
		} else {
			await this.handleEdit( interaction )
		}
	}

	private async handleCreate( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.reply( {
			content: 'Please wait a moment...',
			ephemeral: true
		} )

		const channel = await this.container.utilities.interaction.getInteractionChannel( interaction )
		const placeholder = await channel.send( 'This is a placeholder.' )
		await this.container.stores.get( 'models' ).get( 'messages' )
			.create( placeholder )

		await interaction.deleteReply()
		await this.sendPrompt( interaction, placeholder, true )
	}

	private async handleEdit( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.reply( '...' )

		try {
			const message = await this.getMessage( interaction )
			await this.sendPrompt( interaction, message )
		} catch ( e ) {
			let content: string

			if ( e instanceof MissingMessageError ) {
				content = 'There was an error trying to retrieve a message, it wasn\'t sent by this account or it wasn\'t a customizable message. If the problem continues, try creating a new message.'
			} else {
				content = 'There was an unknown error with your request.'
			}

			await interaction.editReply( content )
			this.container.logger.error( e )
		}
	}

	private async getMessage( interaction: ChatInputCommandInteraction<'cached'> ): Promise<Message<true>> {
		const option = interaction.options.getString( 'message' )
		const messages = this.container.stores.get( 'models' ).get( 'messages' )
		let message: Message<true>

		if ( option ) {
			const messageId = this.parseMessageArgument( option )
			message = await messages.get( messageId )
		} else {
			message = await messages.findLatestByUser( interaction.channelId, interaction.client.user.id )
		}

		if ( message.author.id !== interaction.client.user.id ) {
			throw new MissingMessageError( interaction.channelId, message.id )
		}

		return message
	}

	private parseMessageArgument( option: string ): string {
		const isSnowflake = s.string.regex( SnowflakeRegex ).run( option )
		if ( isSnowflake.isOk() ) return isSnowflake.unwrap()

		return s.string.parse( MessageLinkRegex.exec( option )?.groups?.messageId )
	}

	private async sendPrompt( interaction: ChatInputCommandInteraction<'cached'>, message: Message<true>, followUp?: boolean ): Promise<void> {
		const payload = this.getReplyPayload( message )

		if ( followUp ) {
			payload.ephemeral = true
		}
		const method = followUp ? 'followUp' : 'editReply'
		await interaction[ method ]( payload )
	}

	private getReplyPayload( message: Message<true> ): InteractionReplyOptions {
		const embed = new EmbedBuilder()
			.setColor( Colors.indigo.s800 )
			.setTitle( 'Message editor' )
			.setDescription( 'You can use the following options to modify the selected message. If you aren\'t sure what message are you editing, use the button below.' )
		const selectMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>()
		const buttonRow = new ActionRowBuilder<ButtonBuilder>()

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId( `msgedit-${ message.id }` )
			.setPlaceholder( 'What do you want to edit?' )
			.setOptions(
				{
					description: 'Text outside any embed.',
					label: 'Message content',
					value: 'content'
				},
				{
					description: 'Change the embed\'s description and its color.',
					label: 'Embed content',
					value: 'description'
				}
			)
		const button = new ButtonBuilder()
			.setLabel( 'Link to message' )
			.setStyle( ButtonStyle.Link )
			.setURL( message.url )

		selectMenuRow.addComponents( selectMenu )
		buttonRow.addComponents( button )

		return {
			components: [ selectMenuRow, buttonRow ],
			embeds: [ embed ]
		}
	}
}
