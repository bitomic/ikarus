import { i18n } from '#decorators/i18n'
import { env } from '#lib/environment'
import { Colors } from '@bitomic/material-colors'
import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { ApplicationCommandOptionType, ChannelType, type ChatInputCommandInteraction, type TextChannel, TextInputStyle } from 'discord.js'

@ApplyOptions<CommandOptions>( {
	name: 'mailbox-submit'
} )
export class UserCommand extends Command {
	@i18n
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			description: this.description,
			dmPermission: false,
			name: this.name,
			options: [
				{
					description: '',
					name: 'help',
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'story',
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'clip',
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'meme',
					options: [ {
						description: '',
						name: 'image',
						required: true,
						type: ApplicationCommandOptionType.Attachment
					} ],
					type: ApplicationCommandOptionType.Subcommand
				}
			]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const subcommand = s
			.enum( ...[ 'clip', 'help', 'meme', 'story' ] as const )
			.parse( interaction.options.getSubcommand() )

		await this[ `${ subcommand }Handle` ]( interaction )
	}

	private async clipHandle( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const modal = new ModalBuilder()
			.setCustomId( 'mailbox-clip' )
			.setTitle( 'Comparte un clip' )
			.addComponents( new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId( 'clip' )
					.setLabel( 'Enlace del clip' )
					.setPlaceholder( 'https://clips.twitch.tv/...' )
					.setRequired( true )
					.setStyle( TextInputStyle.Short )
			) )
		await interaction.showModal( modal )
	}

	private async helpHandle( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const embed = new EmbedBuilder()
			.setColor( Colors.indigo.s800 )
			.setTitle( '¡Envía algo al buzón navideño!' )
			.setDescription( '¡Puedes enviar contenido para que revisemos el próximo viernes en la posada navideña en Twitch! Puedes usar los comandos de `/buzon` para:\n- Enviar una anécdota, historia o recuerdo de la comunidad.\n- Compartir un meme especial para la ocasión.\n- Proponer y votar por tus clips favoritos del canal.' )
		await interaction.reply( { embeds: [ embed ] } )
	}

	private async memeHandle( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		try {
			const attachment = interaction.options.getAttachment( 'image', true )
			attachment.name = 'meme.png'

			const { utilities } = this.container
			const channel = env.NODE_ENV === 'development'
				? await utilities.interaction.getInteractionChannel( interaction )
				: await utilities.channel.getChannel( '1186195533375750194', ChannelType.GuildText )
			const thread = await utilities.channel.findThreadByName( channel as TextChannel, 'Memes', ChannelType.PrivateThread )

			const embed = new EmbedBuilder()
				.setAuthor( {
					iconURL: interaction.user.avatarURL( { extension: 'png' } ) ?? '',
					name: interaction.user.username
				} )
				.setColor( Colors.yellow.s800 )
				.setImage( 'attachment://meme.png' )
			await thread.send( {
				embeds: [ embed ],
				files: [ attachment ]
			} )
			await interaction.editReply( 'Se ha enviado tu meme exitosamente. ¡Lo veremos el próximo viernes!' )
		} catch ( e ) {
			this.container.logger.error( e )
			await interaction.editReply( 'Hubo un problema al intentar guardar tu meme. Si el problema persiste, puedes mencionar a <@!697553237867364362>.' )
		}
	}

	private async storyHandle( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const modal = new ModalBuilder()
			.setCustomId( 'mailbox-story' )
			.setTitle( 'Comparte una historia' )
			.addComponents( new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId( 'story' )
					.setLabel( 'Cuéntanos' )
					.setPlaceholder( 'Recuerdo que...' )
					.setRequired( true )
					.setStyle( TextInputStyle.Paragraph )
			) )
		await interaction.showModal( modal )
	}
}
