import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType, type ChatInputCommandInteraction } from 'discord.js'
import { i18n } from '#decorators/i18n'
import { Colors } from '@bitomic/material-colors'
import { permissions } from '#decorators/permissions'
import { PermissionFlagsBits } from 'discord-api-types/v10'
import { s } from '@sapphire/shapeshift'
import { checkEnabled } from '../decorators/check-enabled.js'

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'halloween'
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
					name: 'enable',
					options: [ {
						description: '',
						name: 'enable',
						required: true,
						type: ApplicationCommandOptionType.Boolean
					} ],
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'add-channel',
					options: [ {
						channelTypes: [ ChannelType.GuildText ],
						description: '',
						name: 'channel',
						required: true,
						type: ApplicationCommandOptionType.Channel
					} ],
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'remove-channel',
					options: [ {
						channelTypes: [ ChannelType.GuildText ],
						description: '',
						name: 'channel',
						required: true,
						type: ApplicationCommandOptionType.Channel
					} ],
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'spawning',
					options: [
						{
							description: '',
							maxValue: 60,
							minValue: 5,
							name: 'frequency',
							type: ApplicationCommandOptionType.Integer
						},
						{
							description: '',
							maxValue: 100,
							minValue: 5,
							name: 'chance',
							type: ApplicationCommandOptionType.Integer
						}
					],
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
		} else if ( subcommand === 'add-channel' || subcommand === 'remove-channel' ) {
			await this.updateChannels( interaction )
		} else if ( subcommand === 'spawning' ) {
			await this.spawning( interaction )
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

	@checkEnabled( false )
	protected async spawning( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const guild = await this.container.prisma.halloweenGuild.findUniqueOrThrow( {
			where: {
				id: interaction.guildId
			}
		} )

		const chance = interaction.options.getInteger( 'chance' )
		const frequency = interaction.options.getInteger( 'frequency' ) || 0
		const roundedFrequency = Math.max( 5, 5 * Math.floor( frequency / 5 ) )

		const noChanges = !chance && !frequency
		const sameValues = guild.spawnChance === chance && guild.frequency === roundedFrequency
		if ( noChanges || sameValues ) {
			await this.container.utilities.embed.i18n( interaction, {
				color: Colors.amber.s800,
				description: 'halloween:no-settings'
			}, null, true )
			return
		}

		if ( chance && guild.spawnChance !== chance ) guild.spawnChance = chance
		if ( frequency && guild.frequency !== roundedFrequency ) guild.frequency = roundedFrequency

		await this.container.prisma.halloweenGuild.update( {
			data: {
				frequency: guild.frequency,
				spawnChance: guild.spawnChance
			},
			where: { id: interaction.guild.id }
		} )

		await this.container.utilities.embed.i18n( interaction, {
			color: Colors.deepPurple.s800,
			description: 'halloween:updated-settings'
		}, null, true )
	}

	@checkEnabled( false )
	protected async updateChannels( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const add = interaction.options.getSubcommand() === 'add-channel'
		const channel = interaction.options.getChannel( 'channel', true, [ ChannelType.GuildText ] )

		const guild = await this.container.prisma.halloweenGuild.findUniqueOrThrow( {
			where: {
				id: interaction.guildId
			}
		} )

		const channels = new Set( s.string.array.parse( guild.channels ) )
		const originalSize = channels.size

		if ( add && !channels.has( channel.id ) ) channels.add( channel.id )
		else if ( !add && channels.has( channel.id ) ) channels.delete( channel.id )

		if ( channels.size !== originalSize ) {
			await this.container.prisma.halloweenGuild.update( {
				data: {
					channels: [ ...channels ]
				},
				where: {
					id: interaction.guildId
				}
			} )
		}

		await this.container.utilities.embed.i18n( interaction, {
			color: Colors.deepPurple.s800,
			description: 'halloween:channels-updated'
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
