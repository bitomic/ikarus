import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType, type ChatInputCommandInteraction } from 'discord.js'
import { permissions } from '#decorators/permissions'
import { PermissionFlagsBits } from 'discord-api-types/v10'
import type { UserTask } from '../scheduled-tasks/Spawn.js'
import { env } from '#lib/environment'

@ApplyOptions<CommandOptions>( {
	enabled: env.NODE_ENV === 'development',
	name: 'spawn'
} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
			description: 'Spawn a monster.',
			dmPermission: false,
			name: this.name,
			options: [
				{
					channelTypes: [ ChannelType.GuildText ],
					description: 'Channel to spawn in.',
					name: 'channel',
					required: true,
					type: ApplicationCommandOptionType.Channel
				}
			] satisfies ApplicationCommandOptionData[]
		} )
	}

	@permissions( 'ManageGuild', 'manage-guild' )
	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.reply( 'Attempting to spawn monster.' )

		const channel = interaction.options.getChannel( 'channel', true, [ ChannelType.GuildText ] )
		const task = this.container.stores.get( 'scheduled-tasks' ).get( 'spawn' ) as UserTask
		await task.spawnMonster( channel.id )
	}
}
