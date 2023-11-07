import { ApplicationCommandOptionType, ChannelType, type ChatInputCommandInteraction, type Guild, PermissionFlagsBits, type Role } from 'discord.js'
import { type ApplicationCommandRegistry, Command, type CommandOptions, UserError } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { i18n } from '#decorators/i18n'
import { Colors } from '@bitomic/material-colors'

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'subscribers'
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
					channelTypes: [
						ChannelType.GuildText
					],
					description: '',
					name: 'channel',
					required: true,
					type: ApplicationCommandOptionType.Channel
				}
			]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply()
		const channel = interaction.options.getChannel( 'channel', true, [ ChannelType.GuildText ] )

		try {
			const role = await this.findTwitchRole( interaction.guild )

			const models = this.container.stores.get( 'models' )
			await models.get( 'channel-settings' ).set( interaction.guildId, channel.id, 'twitch-subscribers' )
			await models.get( 'configuration' ).set( interaction.guildId, 'twitch-role', role.id )

			await interaction.editReply( {
				embeds: [ {
					color: Colors.deepPurple.s800,
					description: `Se ha configurado la integración exitosamente. Los miembros que reciban el rol de <@&${ role.id }> ahora serán mencionados en <#${ channel.id }>.`
				} ]
			} )
		} catch ( e ) {
			this.container.logger.error( e )
			await interaction.editReply( {
				content: 'Hubo un problema al intentar configurar el canal donde enviar las notificaciones. Asegúrate de que el servidor tenga una integración de Twitch.'
			} )
			return
		}
	}

	private async findTwitchRole( guild: Guild ): Promise<Role> {
		const roles = await guild.roles.fetch()
		const integrations = await guild.fetchIntegrations()

		const twitchIntegration = integrations.find( i => i.type === 'twitch' )
		if ( !twitchIntegration ) throw new UserError( { identifier: 'Missing twitch integratin' } )

		const role = roles.filter( i => i.tags?.integrationId === twitchIntegration.id ).reduce( ( result, role ) => result.id.localeCompare( role.id ) === -1 ? result : role )
		return role
	}
}
