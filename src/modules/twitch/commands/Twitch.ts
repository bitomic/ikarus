import type { ApplicationCommandOptionData, AutocompleteInteraction, ChatInputCommandInteraction, Interaction } from 'discord.js'
import { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { EmbedBuilder, hyperlink } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import Colors from '@bitomic/material-colors'
import { i18n } from '../../../decorators'
import { resolveKey } from '@sapphire/plugin-i18next'

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'twitch'
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
					name: 'list',
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'add',
					options: [
						{
							autocomplete: true,
							description: '',
							maxLength: 25,
							minLength: 4,
							name: 'streamer',
							required: true,
							type: ApplicationCommandOptionType.String
						},
						{
							channelTypes: [ ChannelType.GuildText ],
							description: '',
							name: 'channel',
							type: ApplicationCommandOptionType.Channel
						}
					],
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: '',
					name: 'remove',
					options: [ {
						autocomplete: true,
						description: '',
						maxLength: 25,
						minLength: 4,
						name: 'streamer',
						required: true,
						type: ApplicationCommandOptionType.String
					} ],
					type: ApplicationCommandOptionType.Subcommand
				}
			] satisfies ApplicationCommandOptionData[]
		} )
	}

	protected async hasPermissions( interaction: Interaction<'cached'>, reply = false ) {
		const hasPermissions = interaction.memberPermissions.has( 'ManageGuild' )

		if ( reply && !hasPermissions && interaction.isCommand() ) {
			const message = await resolveKey( interaction, 'errors:missing-permissions', {
				replace: {
					permission: await resolveKey( interaction, 'misc:permissions.manage-guild' )
				}
			} )
			void interaction.reply( {
				embeds: [ new EmbedBuilder()
					.setDescription( message )
					.setColor( Colors.amber.s800 ) ]
			} )
		}

		return hasPermissions
	}

	public override async autocompleteRun( interaction: AutocompleteInteraction<'cached'> ) {
		if ( !await this.hasPermissions( interaction ) ) {
			void interaction.respond( [] )
			return
		}

		const subcommand = interaction.options.getSubcommand()
		const focused = interaction.options.getFocused()

		if ( subcommand === 'add' ) {
			if ( focused.length < 4 || focused.length > 25 ) {
				void interaction.respond( [] )
				return
			}
			const users = await this.container.twitch.searchStreams( focused )
			void interaction.respond( users.map( user => ( {
				name: user.display_name,
				value: user.broadcaster_login
			} ) ) )
			return
		} else if ( subcommand === 'remove' ) {
			const key = this.getRedisKey( interaction.guildId )
			const cached = ( await this.container.redis.smembers( key ) ).filter( i => i.startsWith( focused ) )
			if ( cached.length ) {
				void interaction.respond( cached.map( i => ( {
					name: i,
					value: i
				} ) ) )
				return
			}

			const stored = ( await this.container.prisma.twitchFollows.findMany( {
				where: { guild: interaction.guildId }
			} ) ).map( i => i.user ).filter( i => i.startsWith( focused ) )
			if ( stored.length ) {
				await this.container.redis.sadd( key, ...stored )
				void interaction.respond( stored.map( i => ( {
					name: i,
					value: i
				} ) ) )
				return
			}
		}

		void interaction.respond( [] )
	}

	public override chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): void {
		const subcommand = interaction.options.getSubcommand()

		if ( subcommand === 'add' ) {
			void this.add( interaction )
		} else if ( subcommand === 'list' ) {
			void this.list( interaction )
		} else if ( subcommand === 'remove' ) {
			void this.remove( interaction )
		}
	}

	protected async add( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		if ( !await this.hasPermissions( interaction, true ) ) return

		const streamer = interaction.options.getString( 'streamer', true )
		const channel = interaction.options.getChannel( 'channel' ) ?? interaction.channel
		if ( !channel || channel.type !== ChannelType.GuildText ) {
			const message = await resolveKey( interaction, 'errors:bad-channel', {
				replace: {
					channel: channel?.id,
					type: await resolveKey( interaction, 'misc:channel-types.text' )
				}
			} )
			void interaction.reply( {
				embeds: [ new EmbedBuilder()
					.setDescription( message )
					.setColor( Colors.amber.s800 ) ]
			} )
			return
		}

		const alreadyStored = await this.container.prisma.twitchFollows.findFirst( {
			where: {
				guild: interaction.guildId,
				user: streamer
			}
		} )
		if ( alreadyStored ) {
			const message = await resolveKey( interaction, 'errors:twitch-already-added', {
				replace: {
					user: streamer
				}
			} )
			void interaction.reply( {
				embeds: [ new EmbedBuilder()
					.setDescription( message )
					.setColor( Colors.amber.s800 ) ]
			} )
			return
		}

		const user = await this.container.twitch.getUser( streamer )
			.catch( () => null )
		if ( !user ) {
			const message = await resolveKey( interaction, 'errors:twitch-not-found', {
				replace: {
					user: streamer
				}
			} )
			void interaction.reply( {
				embeds: [ new EmbedBuilder()
					.setDescription( message )
					.setColor( Colors.amber.s800 ) ]
			} )
			return
		}

		const row = await this.container.prisma.twitchFollows.create( {
			data: {
				channel: channel.id,
				guild: interaction.guildId,
				user: user.login
			}
		} ).catch( () => null )
		const key = this.getRedisKey( interaction.guildId )
		await this.container.redis.sadd( key, user.login )

		if ( !row ) {
			const message = await resolveKey( interaction, 'errors:twitch-db-error', {
				replace: {
					user: streamer
				}
			} )
			void interaction.reply( {
				embeds: [ new EmbedBuilder()
					.setDescription( message )
					.setColor( Colors.amber.s800 ) ]
			} )
			return
		}

		const message = await resolveKey( interaction, 'twitch:add-success', {
			replace: {
				channel: channel.id,
				user: streamer
			}
		} )
		void interaction.reply( {
			embeds: [ new EmbedBuilder()
				.setDescription( message )
				.setColor( Colors.deepPurple.a400 ) ]
		} )
	}

	protected async list( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply()

		const streams = await this.container.prisma.twitchFollows.findMany( {
			where: {
				guild: interaction.guildId
			}
		} )
		const embed = new EmbedBuilder()
			.setTitle( await resolveKey( interaction, 'twitch:list-title' ) )
			.setDescription( streams.map( stream => {
				const url = `https://twitch.tv/${ stream.user }`
				const link = hyperlink( stream.user, url )
				return `- ${ link }`
			} ).join( '\n' ) )
			.setColor( Colors.deepPurple.a400 )
		void interaction.editReply( {
			embeds: [ embed ]
		} )
	}

	protected async remove( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		if ( !await this.hasPermissions( interaction, true ) ) return

		const user = interaction.options.getString( 'streamer', true )
		const row = await this.container.prisma.twitchFollows.findFirst( {
			where: {
				guild: interaction.guildId,
				user
			}
		} )

		if ( !row ) {
			const message = await resolveKey( interaction, 'twitch:remove-fail', {
				replace: { user }
			} )
			void interaction.reply( {
				embeds: [ new EmbedBuilder()
					.setDescription( message )
					.setColor( Colors.amber.s800 ) ]
			} )
			return
		}

		await this.container.prisma.twitchFollows.delete( {
			where: {
				channel_user: {
					channel: row.channel,
					user: row.user
				}
			}
		} )
		const key = this.getRedisKey( interaction.guildId )
		await this.container.redis.srem( key, row.user )
		const message = await resolveKey( interaction, 'twitch:remove-success', {
			replace: { user }
		} )
		void interaction.reply( {
			embeds: [ new EmbedBuilder()
				.setDescription( message )
				.setColor( Colors.green.s800 ) ]
		} )
	}

	protected getRedisKey( guild: string ): string {
		return `ajax:twitch-follows/${ guild }`
	}
}
