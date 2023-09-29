import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ApplicationCommandOptionData, ApplicationCommandOptionType, type ChatInputCommandInteraction } from 'discord.js'
import { i18n } from '#decorators/i18n'
import { Colors } from '@bitomic/material-colors'
import { resolveKey } from '@sapphire/plugin-i18next'

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'halloween'
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
					name: 'enable',
					options: [ {
						description: '',
						name: 'enable',
						required: true,
						type: ApplicationCommandOptionType.Boolean
					} ],
					type: ApplicationCommandOptionType.Subcommand
				}
			] satisfies ApplicationCommandOptionData[]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const hasPermissions = interaction.memberPermissions.has( 'ManageGuild', true )
		if ( !hasPermissions ) {
			await this.container.utilities.embed.i18n( interaction, {
				color: Colors.amber.s800,
				description: 'errors:missing-permissions'
			}, { permissions: await resolveKey( interaction, 'misc:permissions.manage-guild' ) }, true )
			return
		}

		const subcommand = interaction.options.getSubcommand()

		if ( subcommand === 'enable' ) {
			void this.enable( interaction )
		}
	}

	protected async enable( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply()
		const toEnable = interaction.options.getBoolean( 'enable', true )

		const guild = await this.container.prisma.halloweenGuild.findUnique( {
			where: {
				id: interaction.guild.id
			}
		} )

		const noUpdate = ( !guild && toEnable === false ) || guild?.enabled === toEnable // eslint-disable-line no-extra-parens
		if ( noUpdate ) {
			await this.container.utilities.embed.i18n( interaction, {
				color: Colors.amber.s800,
				description: 'halloween:enable.no-change'
			}, null, true )
			return
		}

		await this.container.prisma.halloweenGuild.upsert( {
			create: {
				channels: [],
				enabled: toEnable,
				id: interaction.guild.id
			},
			update: {
				enabled: toEnable
			},
			where: {
				id: interaction.guild.id
			}
		} )

		const key = toEnable ? 'enabled' : 'disabled'
		await this.container.utilities.embed.i18n( interaction, {
			color: Colors.deepPurple.s800,
			description: `halloween:enable.${ key }`
		}, null, true )
	}
}
