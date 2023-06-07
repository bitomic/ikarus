import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { i18n } from '../../../decorators'

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'ping'
} )
export class UserCommand extends Command {
	@i18n
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			description: this.description,
			name: this.name
		} )
	}

	public override chatInputRun( interaction: CommandInteraction ): void {
		void interaction.reply( 'Pong!' )
	}
}
