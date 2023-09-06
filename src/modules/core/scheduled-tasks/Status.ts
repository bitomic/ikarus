import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { ActivityType } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Time } from '@sapphire/duration'

@ApplyOptions<ScheduledTaskOptions>( {
	interval: Time.Hour,
	name: 'status'
} )
export class UserTask extends ScheduledTask {
	public static readonly quotes = [
		'I\'m No. 11 of the Fatui Harbinger',
		'There\'s nothing to kill',
		'I wonder what the rest of the Harbingers are up to?',
		'Ah, perfect weather for fishing!',
		'The world looks glorious in the snow',
		'I am the least adept with a bow',
		'If it makes me stronger, I\'ll take it',
		'Heretical teachings from the Abyss? Sign me up',
		'Delusion? Don\'t mind if I do'
	]

	public override run(): void {
		const status = UserTask.quotes[ Math.floor( Math.random() * UserTask.quotes.length ) ] ?? ''

		this.container.client.user?.setPresence( {
			activities: [ {
				name: 'Custom',
				state: `${ status } | v${ process.env.npm_package_version ?? '1.0.0' }`,
				type: ActivityType.Custom
			} ]
		} )
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		status: never;
	}
}
