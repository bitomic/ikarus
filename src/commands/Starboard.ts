import { ApplicationCommandOptionType, ChannelType, type ChatInputCommandInteraction, type Message } from 'discord.js'
import type { ApplicationCommandRegistry, CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import Colors from '@bitomic/material-colors'
import { Command } from '@sapphire/framework'
import { EmbedBuilder } from '@discordjs/builders'
import { resolveKey } from '@sapphire/plugin-i18next'
import type { TFunction } from 'i18next'

@ApplyOptions<CommandOptions>( {
	enabled: true
} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		const en = this.container.i18n.getT( 'en-US' )
		registry.registerChatInputCommand( {
			description: en( 'commands:starboard.description' ),
			dm_permission: false,
			name: en( 'commands:starboard.name' ),
			options: [
				{
					description: en( 'commands:starboard.subcommands.user.description' ),
					name: en( 'commands:starboard.subcommands.user.name' ),
					options: [ {
						description: en( 'commands:starboard.subcommands.user.options.user.description' ),
						name: en( 'commands:starboard.subcommands.user.options.user.name' ),
						type: ApplicationCommandOptionType.User
					} ],
					type: ApplicationCommandOptionType.Subcommand
				}
			]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const en = this.container.i18n.getT( 'en-US' )
		await interaction.deferReply()

		const subcommand = interaction.options.getSubcommand()
		if ( subcommand === en( 'commands:starboard.subcommands.user.name' ) ) {
			void this.getUserStats( interaction, en )
		}
	}

	protected async getUserStats( interaction: ChatInputCommandInteraction<'cached'>, en: TFunction ): Promise<void> {
		const user = interaction.options.getUser( en( 'commands:starboard.subcommands.user.options.user.name' ) ) ?? interaction.user
		const messages = await this.container.stores.get( 'models' ).get( 'StarboardMessages' )
			.getUserMessages( interaction.guildId, user.id )
		const embed = new EmbedBuilder()
			.setColor( Colors.yellow.s800 )
			.setDescription( await resolveKey( interaction, 'starboard:user-stats.description', { replace: { user: user.id } } ) )
			.setThumbnail( await this.container.images.getUserAvatar( user ) )
			.setTitle( await resolveKey( interaction, 'starboard:user-stats.title', { replace: { user: user.username } } ) )

		embed.addFields( {
			inline: true,
			name: await resolveKey( interaction, 'starboard:user-stats.message-count' ),
			value: `${ messages.length }`
		} )

		const content = await resolveKey( interaction, 'starboard:user-stats.loading' )
		await interaction.editReply( {
			content: messages.length > 0 ? content : null,
			embeds: [ embed ]
		} )
		if ( messages.length === 0 ) return

		try {
			let totalStars = 0
			let maxStars = 0
			let maxStarsMessage: Message | null = null
			let firstStar: Message | null = null
			let lastStar: Message | null = null

			const guild = await this.container.client.guilds.fetch( interaction.guildId )
			for ( const message of messages ) {
				const channel = await guild.channels.fetch( message.pinChannel )
					.catch( () => null )
				if ( channel?.type !== ChannelType.GuildText ) continue
				const msg = await channel.messages.fetch( message.pinMessage )
					.catch( () => null )
				if ( !msg ) continue

				const [ stars ] = msg.content.match( /\d+/ ) ?? []
				if ( !stars ) continue

				const starCount = parseInt( stars, 10 )
				totalStars += starCount

				if ( maxStars < starCount ) {
					maxStars = starCount
					maxStarsMessage = msg
				}

				if ( firstStar ) {
					firstStar = firstStar.createdTimestamp < msg.createdTimestamp ? firstStar : msg
				} else {
					firstStar = msg
				}

				if ( lastStar ) {
					lastStar = lastStar.createdTimestamp < msg.createdTimestamp ? msg : lastStar
				} else {
					lastStar = msg
				}
			}

			const link = await resolveKey( interaction, 'general:link' )
			const maxStarsLink = maxStarsMessage ? `([${ link }](${ maxStarsMessage.url }))` : ''
			embed.addFields(
				{ inline: true, name: await resolveKey( interaction, 'starboard:user-stats.total-stars' ), value: `${ totalStars }` },
				{ inline: true, name: await resolveKey( interaction, 'starboard:user-stats.max-stars' ), value: `${ maxStars } ${ maxStarsLink }` }
			)

			if ( firstStar ) {
				embed.addFields( {
					inline: true,
					name: await resolveKey( interaction, 'starboard:user-stats.first-star' ),
					value: `<t:${ Math.floor( firstStar.createdTimestamp / 1000 ) }:R> ([${ link }](${ firstStar.url }))`
				} )
			}

			if ( lastStar ) {
				embed.addFields( {
					inline: true,
					name: await resolveKey( interaction, 'starboard:user-stats.last-star' ),
					value: `<t:${ Math.floor( lastStar.createdTimestamp / 1000 ) }:R> ([${ link }](${ lastStar.url }))`
				} )
			}

			await interaction.editReply( {
				content: null,
				embeds: [ embed ]
			} )
		} catch {
			const content = await resolveKey( interaction, 'starboard:user-stats.load-failed' )
			await interaction.editReply( { content } )
		}
	}
}
