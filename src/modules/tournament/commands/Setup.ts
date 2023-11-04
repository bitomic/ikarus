import { i18n } from '#decorators/i18n'
import { tournamentGame } from '#drizzle/schema'
import { ActionRowBuilder, StringSelectMenuBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { SelectMenuLimits } from '@sapphire/discord-utilities'
import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { type ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType, type ChatInputCommandInteraction, ComponentType, type GuildTextBasedChannel, type Message, PermissionFlagsBits } from 'discord.js'
import { and, eq } from 'drizzle-orm'

@ApplyOptions<CommandOptions>( {
	name: 'tournament'
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
					name: 'setup',
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'add-game',
					options: [
						{
							description: '',
							name: 'game',
							required: true,
							type: ApplicationCommandOptionType.String
						},
						{
							description: '',
							minValue: 1,
							name: 'min-players',
							type: ApplicationCommandOptionType.Number
						},
						{
							description: '',
							minValue: 1,
							name: 'max-players',
							type: ApplicationCommandOptionType.Number
						},
						{
							description: '',
							minValue: 0,
							name: 'max-teams',
							type: ApplicationCommandOptionType.Number
						}
					],
					type: ApplicationCommandOptionType.Subcommand
				}
			] satisfies ApplicationCommandOptionData[]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const subcommand = s.enum( ...[ 'setup', 'add-game' ] as const ).parse( interaction.options.getSubcommand() )

		if ( subcommand === 'setup' ) {
			await this.setup( interaction )
		} else {
			await this.addGame( interaction )
		}
	}

	protected async addGame( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		const { options } = interaction
		const game = options.getString( 'game', true )
		const maxPlayers = options.getNumber( 'max-players' ) || 1
		const minPlayers = options.getNumber( 'min-players' ) || 1
		const maxTeams = options.getNumber( 'max-teams' )

		const { drizzle } = this.container
		const stored = await this.findGuildGame( interaction.guildId, game )
		if ( !stored ) {
			await drizzle.insert( tournamentGame )
				.values( {
					game,
					guild: interaction.guildId,
					maxPlayers,
					maxTeams,
					minPlayers
				} )
		}

		const message = await this.findPinnedMessage( interaction )
		if ( !message ) return
		const dropdown = await this.getStringSelect( interaction, message )
		if ( !dropdown ) return

		const games = await drizzle.select()
			.from( tournamentGame )
			.where( eq( tournamentGame.guild, interaction.guildId ) )
			.orderBy( tournamentGame.game )
			.limit( SelectMenuLimits.MaximumOptionsLength )

		dropdown.setOptions( games.map( game => ( {
			label: game.game,
			value: `${ game.id }`
		} ) ) )
		await message.edit( {
			components: [ new ActionRowBuilder<StringSelectMenuBuilder>().addComponents( dropdown ) ]
		} )
		await interaction.editReply( {
			content: 'The game was added successfully.'
		} )
	}

	protected async setup( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const message = await this.findPinnedMessage( interaction )
		if ( !message ) return

		await interaction.reply( {
			content: 'Found a message to setup tournament features.',
			ephemeral: true
		} )

		const row = new ActionRowBuilder<StringSelectMenuBuilder>()
		row.addComponents( new StringSelectMenuBuilder( {
			custom_id: 'tournament-game',
			max_values: 1,
			min_values: 1,
			options: [
				{ label: 'Ninguno', value: '0' }
			],
			placeholder: 'Escoge un juego'
		} ) )
		await message.edit( {
			components: [ row ]
		} )
	}

	protected async fetchChannel( interaction: ChatInputCommandInteraction<'cached'> ): Promise<GuildTextBasedChannel> {
		const channel = interaction.channel ?? await this.container.utilities.channel.getChannel( interaction.channelId, ChannelType.GuildText )
		return channel
	}

	protected async getStringSelect( interaction: ChatInputCommandInteraction<'cached'>, message: Message<true> ): Promise<StringSelectMenuBuilder | null> {
		const rawRow = message.components.at( 0 )
		const menu = rawRow?.components.at( 0 )

		if ( menu?.type !== ComponentType.StringSelect ) {
			await interaction.editReply( {
				content: 'Couldn\'t retrieve an action row from the message.'
			} )
			return null
		}


		return new StringSelectMenuBuilder( menu.toJSON() )
	}

	protected async findGuildGame( guild: string, game: string ): Promise<typeof tournamentGame.$inferSelect | null> {
		const [ stored ] = await this.container.drizzle.select()
			.from( tournamentGame )
			.where( and(
				eq( tournamentGame.guild, guild ),
				eq( tournamentGame.game, game )
			) )
			.limit( 1 )

		return stored ?? null
	}

	protected async findPinnedMessage( interaction: ChatInputCommandInteraction<'cached'>, channel?: GuildTextBasedChannel ): Promise<Message<true> | null> {
		channel ??= await this.fetchChannel( interaction )
		const pins = await channel.messages.fetchPinned()
		const message = pins.find( i => i.author.id === this.container.client.user?.id )
		if ( !message ) {
			await interaction.reply( {
				content: 'There must be a message sent from this bot account in this channel\'s pins to modify.',
				ephemeral: true
			} )
			return null
		}

		return message
	}
}
