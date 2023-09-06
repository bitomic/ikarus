import { ApplicationCommandOptionType, type ChatInputCommandInteraction } from 'discord.js'
import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { EmbedBuilder } from '@discordjs/builders'
import { Colors } from '@bitomic/material-colors'
import { env } from '#lib/environment'

@ApplyOptions<CommandOptions>( {
	description: 'Banea a un miembro del servidor (falso).',
	enabled: true,
	name: 'ban'
} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			description: this.description,
			dmPermission: false,
			name: this.name,
			options: [
				{
					description: 'Usuario a banear.',
					name: 'usuario',
					required: true,
					type: ApplicationCommandOptionType.User
				},
				{
					description: 'Motivo del baneo',
					maxLength: 200,
					minLength: 1,
					name: 'motivo',
					type: ApplicationCommandOptionType.String
				}
			]
		}, {
			guildIds: [ env.NODE_ENV === 'development' ? env.DISCORD_DEVELOPMENT_SERVER : '1038642068341403771' ]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply()

		const user = interaction.options.getUser( 'usuario', true )
		const reason = interaction.options.getString( 'motivo' )
		const member = await interaction.guild.members.fetch( user ).catch( () => null )

		const username = member?.nickname ?? user.username

		const embed = new EmbedBuilder()
			.setTitle( `${ username } ha recibido el rasho baneador.` )
			.setDescription( `<@!${ user.id }> ha sido baneado por <@!${ interaction.user.id }>.` )
			.setThumbnail( member?.avatarURL( { extension: 'png' } ) ?? null )
			.setImage( 'https://i.imgur.com/oXyIqjL.jpg' )
			.setColor( member?.displayColor ?? Colors.deepOrange.s800 )

		if ( reason ) {
			embed.addFields( {
				name: 'Motivo',
				value: reason
			} )
		}

		await interaction.editReply( { embeds: [ embed ] } )
	}
}
