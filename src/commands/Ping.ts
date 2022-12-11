import type { ApplicationCommandRegistry, CommandOptions } from '@sapphire/framework'
import type { CommandInteraction, Message } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'

@ApplyOptions<CommandOptions>( {
	description: 'Pong!',
	enabled: true,
	name: 'ping'
	} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			description: this.description,
			name: this.name
		} )
	}

	public override chatInputRun( interaction: CommandInteraction ): void {
		void interaction.reply( 'Pong!' )
	}

	public override messageRun( message: Message ): void {
		void message.reply( 'Pong!' )
	}
}
