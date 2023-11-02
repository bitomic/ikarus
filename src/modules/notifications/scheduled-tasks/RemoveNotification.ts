import { ApplyOptions } from '@sapphire/decorators'
import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { s } from '@sapphire/shapeshift'
import { ChannelType } from 'discord.js'

@ApplyOptions<ScheduledTaskOptions>( {
	enabled: true,
	name: 'remove-notification'
} )
export class UserTask extends ScheduledTask {
	public override async run( payload: unknown ): Promise<void> {
		const data = s.object( {
			channel: s.string,
			message: s.string
		} ).parse( payload )

		const channel = await this.container.utilities.channel.getChannel( data.channel, ChannelType.GuildText )
		const message = await channel.messages.fetch( data.message )

		await message.delete()
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		'remove-notification': never;
	}
}
