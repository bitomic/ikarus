import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ApplicationCommandOptionData, ApplicationCommandOptionType, type ChatInputCommandInteraction } from 'discord.js'
import { i18n } from '#decorators/i18n'
import { Colors } from '@bitomic/material-colors'
import { permissions } from '#decorators/permissions'

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'halloween'
} )
export class UserCommand extends Command {
	@i18n
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			defaultMemberPermissions: 'ManageGuild',
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

	@permissions( 'ManageGuild', 'manage-guild' )
	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const subcommand = interaction.options.getSubcommand()

		if ( subcommand === 'enable' ) {
			await this.enable( interaction )
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

		await this.upsertGuild( interaction.guildId, toEnable )

		const key = toEnable ? 'enabled' : 'disabled'
		await this.container.utilities.embed.i18n( interaction, {
			color: Colors.deepPurple.s800,
			description: `halloween:enable.${ key }`
		}, null, true )
	}

	protected async upsertGuild( guildId: string, enabled?: boolean ): Promise<void> {
		enabled ??= false

		await this.container.prisma.halloweenGuild.upsert( {
			create: {
				channels: [],
				enabled,
				id: guildId
			},
			update: {
				enabled
			},
			where: {
				id: guildId
			}
		} )
	}
}
