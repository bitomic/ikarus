import { i18n } from '#decorators/i18n'
import { permissions } from '#decorators/permissions'
import { ApplyOptions } from '@sapphire/decorators'
import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { ApplicationCommandOptionType, ButtonStyle, ChannelType, type ChatInputCommandInteraction, PermissionFlagsBits, type PrivateThreadChannel, type PublicThreadChannel, ThreadAutoArchiveDuration } from 'discord.js'
import { MissingChannelError } from '../../../errors/MissingChannel.js'
import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders'
import { match } from 'ts-pattern'

@ApplyOptions<CommandOptions>( {
	name: 'confessional'
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
					name: 'setup',
					options: [
						{
							description: '',
							name: 'enable',
							options: [
								{
									description: '',
									name: 'message',
									type: ApplicationCommandOptionType.String
								},
								{
									channelTypes: [
										ChannelType.GuildAnnouncement,
										ChannelType.GuildForum,
										ChannelType.GuildText,
										ChannelType.PrivateThread,
										ChannelType.PublicThread
									],
									description: '',
									name: 'channel',
									type: ApplicationCommandOptionType.Channel
								}
							],
							type: ApplicationCommandOptionType.Subcommand
						},
						{
							description: '',
							name: 'set-channel',
							options: [ {
								channelTypes: [
									ChannelType.GuildAnnouncement,
									ChannelType.GuildForum,
									ChannelType.GuildText,
									ChannelType.PrivateThread,
									ChannelType.PublicThread
								],
								description: '',
								name: 'channel',
								required: true,
								type: ApplicationCommandOptionType.Channel
							} ],
							type: ApplicationCommandOptionType.Subcommand
						}
					],
					type: ApplicationCommandOptionType.SubcommandGroup
				}
			]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const group = s
			.enum( ...[ 'setup' ] as const )
			.nullable
			.parse( interaction.options.getSubcommandGroup() )
		const subcommand = s
			.enum( ...[ 'enable', 'set-channel' ] as const )
			.parse( interaction.options.getSubcommand() )

		const matched = match( { group, subcommand } )
			.with( { group: 'setup', subcommand: 'enable' }, () => 'handleSetup' as const )
			.with( { group: 'setup', subcommand: 'set-channel' }, () => 'handleSetChannel' as const )
			.run()

		await this[ matched ]( interaction )
	}

	@permissions( PermissionFlagsBits.ManageGuild, 'manage-guild' )
	private async handleSetChannel( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )
		const channel = await this.getTargetChannel( interaction )
		await interaction.editReply( `New confessions will be sent to <#${ channel.id }>.` )
	}

	@permissions( PermissionFlagsBits.ManageGuild, 'manage-guild' )
	private async handleSetup( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		await this.getTargetChannel( interaction )
		const message = await this.container.utilities.interaction.getCustomizableMessage( interaction )

		const row = new ActionRowBuilder<ButtonBuilder>()
			.setComponents(
				new ButtonBuilder()
					.setCustomId( 'confession-private' )
					.setLabel( 'Enviar anónimamente' )
					.setStyle( ButtonStyle.Primary ),
				new ButtonBuilder()
					.setCustomId( 'confession-public' )
					.setLabel( 'Enviar con nombre' )
					.setStyle( ButtonStyle.Secondary )
			)
		await message.edit( {
			components: [ row ]
		} )
		await interaction.deleteReply()
	}

	private async getTargetChannel( interaction: ChatInputCommandInteraction<'cached'> ) {
		let option = interaction.options.getChannel( 'channel', false, [
			ChannelType.GuildAnnouncement,
			ChannelType.GuildForum,
			ChannelType.GuildText,
			ChannelType.PrivateThread,
			ChannelType.PublicThread
		] )

		if ( !option ) {
			const currentChannel = await this.container.utilities.interaction.getInteractionChannel( interaction )
			if ( currentChannel.isThread() || currentChannel.isVoiceBased() ) {
				throw new MissingChannelError( currentChannel.id )
			}

			if ( currentChannel.type === ChannelType.GuildAnnouncement ) {
				option = await currentChannel.threads.create( {
					autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
					name: 'Confessions'
				} ) as PublicThreadChannel
			} else {
				option = await currentChannel.threads.create( {
					autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
					name: 'Confessions',
					type: ChannelType.PrivateThread
				} ) as PrivateThreadChannel
			}
		}

		await this.container.stores.get( 'models' ).get( 'channel-settings' )
			.set( interaction.guildId, option.id, 'confessional' )
		return option
	}
}
