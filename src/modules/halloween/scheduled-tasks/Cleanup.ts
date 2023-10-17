import { ApplyOptions } from '@sapphire/decorators'
import { SnowflakeRegex } from '@sapphire/discord-utilities'
import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { s } from '@sapphire/shapeshift'
import { ChannelType } from 'discord.js'

@ApplyOptions<ScheduledTaskOptions>( {
	name: 'cleanup'
} )
export class UserTask extends ScheduledTask {
	public static readonly PayloadSchema = s.object( {
		channelId: s.string.regex( SnowflakeRegex ),
		messageId: s.string.regex( SnowflakeRegex )
	} )

	public async run( payload: unknown ): Promise<void> {
		const data = UserTask.PayloadSchema.run( payload )
		if ( data.isErr() ) return

		const { channelId, messageId } = data.unwrap()
		const channel = await this.container.client.channels.fetch( channelId )
		if ( channel?.type !== ChannelType.GuildText ) return

		const message = await channel.messages.fetch( messageId ).catch( () => null )
		if ( !message?.deletable ) return

		await message.delete()
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		cleanup: never;
	}
}
